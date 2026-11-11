BEGIN;

LOCK TABLE report, saved_report IN SHARE ROW EXCLUSIVE MODE;

CREATE TEMP TABLE step2_original_reports ON COMMIT DROP AS
SELECT id, to_jsonb(sr) AS original_value FROM saved_report sr;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM saved_report sr
        JOIN saved_brief b ON b.id = sr.saved_brief_id AND b.is_department_journal
        LEFT JOIN report r ON r.id = sr.report_id AND r.company_id = sr.company_id
        WHERE r.id IS NULL OR r.once_per IS DISTINCT FROM 'day'::once_per_enum
            OR sr.company_id IS DISTINCT FROM b.company_id
            OR sr.department_id IS DISTINCT FROM b.department_id
            OR sr.date IS DISTINCT FROM b.date
    ) THEN
        RAISE EXCEPTION 'New journal schedules require renewed mapping review';
    END IF;
END;
$$;

CREATE TABLE report_schedule (
    slot_key uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id integer NOT NULL REFERENCES report(id),
    company_id uuid NOT NULL REFERENCES company(id),
    position integer NOT NULL CHECK (position > 0),
    once_per once_per_enum NOT NULL,
    weekday_mask integer,
    month_day integer,
    day_time text NOT NULL CHECK (day_time IN ('opening', 'midday', 'closing', 'ongoing')),
    shift_id integer REFERENCES shift(id),
    holder_id uuid REFERENCES website_user(id),
    check_before text CHECK (check_before IS NULL OR check_before ~ '^(1[0-2]|[1-9]) (AM|PM)$'),
    CONSTRAINT report_schedule_period_check CHECK (
        (once_per = 'day' AND weekday_mask IS NULL AND month_day IS NULL)
        OR (once_per = 'week' AND weekday_mask IS NOT NULL AND weekday_mask BETWEEN 1 AND 127 AND month_day IS NULL)
        OR (once_per = 'month' AND weekday_mask IS NULL AND month_day IS NOT NULL AND month_day BETWEEN 1 AND 31)
    )
);

INSERT INTO report_schedule (
    report_id, company_id, position, once_per, weekday_mask, month_day, day_time, holder_id, check_before
)
SELECT id, company_id, 1, once_per,
    CASE WHEN once_per = 'week' THEN start_at_day END,
    CASE WHEN once_per = 'month' THEN start_at_day END,
    day_time, default_holder_id, NULLIF(check_before, '')
FROM report;

INSERT INTO report_schedule (
    report_id, company_id, position, once_per, weekday_mask, day_time, holder_id, check_before
)
SELECT id, company_id, 2, 'week', backup_start_at_day, day_time, backup_holder_id, NULLIF(check_before, '')
FROM report WHERE backup_holder_id IS NOT NULL AND COALESCE(backup_start_at_day, 0) <> 0;

ALTER TABLE saved_report
    ADD COLUMN slot_key text,
    ADD COLUMN slot_position integer,
    ADD COLUMN shift_id integer REFERENCES shift(id),
    ADD COLUMN shift_name text;

UPDATE saved_report SET slot_key = 'legacy:' || id::text;

UPDATE saved_report sr
SET slot_key = rs.slot_key::text, slot_position = rs.position
FROM report_schedule rs, saved_brief b
WHERE sr.saved_brief_id = b.id AND b.is_department_journal
    AND sr.report_id = rs.report_id AND sr.company_id = rs.company_id AND rs.position = 1;

ALTER TABLE saved_report
    ALTER COLUMN slot_key SET NOT NULL,
    DROP CONSTRAINT saved_report_brief_report_unique,
    ADD CONSTRAINT saved_report_department_slot_unique
        UNIQUE (company_id, department_id, date, report_id, slot_key);

DO $$
BEGIN
    IF (SELECT count(*) FROM report_schedule) <> (
        SELECT count(*) + count(*) FILTER (
            WHERE backup_holder_id IS NOT NULL AND COALESCE(backup_start_at_day, 0) <> 0
        ) FROM report
    ) THEN
        RAISE EXCEPTION 'Schedule migration count mismatch';
    END IF;
    IF EXISTS (
        SELECT 1 FROM step2_original_reports original
        FULL JOIN saved_report current_row ON current_row.id = original.id
        WHERE original.id IS NULL OR current_row.id IS NULL
            OR original.original_value IS DISTINCT FROM (
                to_jsonb(current_row) - ARRAY['slot_key', 'slot_position', 'shift_id', 'shift_name']::text[]
            )
    ) THEN
        RAISE EXCEPTION 'Existing report data changed';
    END IF;
END;
$$;

COMMIT;
