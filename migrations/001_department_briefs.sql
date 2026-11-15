BEGIN;

CREATE TEMP TABLE migration_counts ON COMMIT DROP AS
SELECT (SELECT count(*) FROM saved_brief) AS briefs,
       (SELECT count(*) FROM saved_report) AS reports,
       (SELECT count(*) FROM saved_task) AS tasks,
       (SELECT count(*) FROM handoff) AS handoffs;

ALTER TABLE company ADD COLUMN timezone text NOT NULL DEFAULT 'America/Los_Angeles';

ALTER TABLE saved_brief
    ADD COLUMN department_id uuid REFERENCES department(id),
    ADD COLUMN is_department_journal boolean NOT NULL DEFAULT false,
    ADD COLUMN shift_id integer REFERENCES shift(id),
    ADD COLUMN started_at timestamptz,
    ADD COLUMN closed_at timestamptz,
    ADD COLUMN closed_by uuid REFERENCES website_user(id);

CREATE TABLE brief_report (
    saved_brief_id integer NOT NULL REFERENCES saved_brief(id),
    saved_report_id integer NOT NULL REFERENCES saved_report(id),
    PRIMARY KEY (saved_brief_id, saved_report_id)
);

INSERT INTO brief_report (saved_brief_id, saved_report_id)
SELECT b.id, s.id
FROM saved_report s
JOIN saved_brief b ON b.id = s.saved_brief_id AND b.company_id = s.company_id
UNION
SELECT b.id, s.id
FROM saved_brief b
JOIN website_user u ON u.id = b.lead_id AND u.company_id = b.company_id
JOIN saved_report s ON s.company_id = b.company_id AND s.date = b.date
JOIN report r ON r.id = s.report_id AND r.company_id = s.company_id
WHERE r.assigned_to->'all'->>'assigned' = 'true'
   OR (r.assigned_to->'department'->>'assigned' = 'true'
       AND r.assigned_to->'department'->'list' @> jsonb_build_array(u.department_id::text));

CREATE TEMP TABLE migrated_departments ON COMMIT DROP AS
SELECT DISTINCT d.id AS source_id, u.company_id, gen_random_uuid() AS target_id
FROM department d
JOIN (SELECT DISTINCT department_id, company_id FROM website_user) u ON u.department_id = d.id
WHERE d.company_id <> u.company_id;

INSERT INTO department (id, name, is_main, company_id)
SELECT m.target_id, d.name, d.is_main, m.company_id
FROM migrated_departments m JOIN department d ON d.id = m.source_id;

UPDATE website_user u SET department_id = m.target_id
FROM migrated_departments m
WHERE u.company_id = m.company_id AND u.department_id = m.source_id;

UPDATE report r
SET assigned_to = jsonb_set(r.assigned_to, '{department,list}', (
    SELECT jsonb_agg(to_jsonb(COALESCE(m.target_id::text, item.value)) ORDER BY item.position)
    FROM jsonb_array_elements_text(r.assigned_to->'department'->'list') WITH ORDINALITY item(value, position)
    LEFT JOIN migrated_departments m ON m.source_id::text = item.value AND m.company_id = r.company_id
))
WHERE EXISTS (SELECT 1 FROM migrated_departments m WHERE m.company_id = r.company_id
    AND r.assigned_to->'department'->'list' @> jsonb_build_array(m.source_id::text));

UPDATE report r SET department_id = m.target_id
FROM migrated_departments m WHERE r.company_id = m.company_id AND r.department_id = m.source_id;

UPDATE daily_log l SET department_id = m.target_id
FROM migrated_departments m WHERE l.company_id = m.company_id AND l.department_id = m.source_id;

UPDATE saved_brief b SET department_id = u.department_id
FROM website_user u WHERE u.id = b.original_lead_id AND u.company_id = b.company_id;

UPDATE saved_brief b SET shift_id = s.id
FROM (SELECT company_id, name, min(id) AS id FROM shift GROUP BY company_id, name HAVING count(*) = 1) s
WHERE s.company_id = b.company_id AND s.name = b.shift;

ALTER TABLE saved_brief ADD CONSTRAINT saved_brief_journal_state_check CHECK (
    NOT is_department_journal OR (company_id IS NOT NULL AND department_id IS NOT NULL
        AND date IS NOT NULL AND lead_id IS NOT NULL AND shift_id IS NOT NULL AND started_at IS NOT NULL
        AND freezed IS NOT NULL AND (NOT freezed OR (closed_at IS NOT NULL AND closed_by IS NOT NULL)))
);

CREATE UNIQUE INDEX saved_brief_department_day_unique
    ON saved_brief (company_id, department_id, date) WHERE is_department_journal;
CREATE INDEX saved_brief_department_history_idx ON saved_brief (company_id, department_id, date DESC);
CREATE INDEX brief_report_saved_report_idx ON brief_report (saved_report_id);

ALTER TABLE saved_report
    ADD COLUMN planned_holder_id uuid REFERENCES website_user(id),
    ADD COLUMN completed_by uuid REFERENCES website_user(id),
    ADD COLUMN assignment_overridden boolean NOT NULL DEFAULT false,
    ADD COLUMN cancelled_at timestamptz,
    DROP CONSTRAINT saved_report_report_id_date_unique,
    ADD CONSTRAINT saved_report_brief_report_unique UNIQUE (saved_brief_id, report_id);

ALTER TABLE handoff
    ADD COLUMN saved_brief_id integer REFERENCES saved_brief(id),
    ADD COLUMN from_user_id uuid REFERENCES website_user(id),
    ADD COLUMN to_user_id uuid REFERENCES website_user(id),
    ADD COLUMN from_shift_id integer REFERENCES shift(id),
    ADD COLUMN to_shift_id integer REFERENCES shift(id),
    ADD COLUMN from_shift_name text,
    ADD COLUMN to_shift_name text,
    ADD COLUMN transferred_at timestamptz;

WITH candidates AS (
    SELECT h.id, min(b.id) AS brief_id FROM handoff h
    JOIN saved_brief b ON b.company_id = h.company_id AND b.date = h.date AND b.lead_name = h.from_name
    GROUP BY h.id HAVING count(*) = 1
)
UPDATE handoff h SET saved_brief_id = c.brief_id FROM candidates c WHERE h.id = c.id;

WITH candidates AS (
    SELECT h.id, min(u.id::text)::uuid AS user_id FROM handoff h
    JOIN website_user u ON u.company_id = h.company_id AND u.name = h.from_name
    GROUP BY h.id HAVING count(*) = 1
)
UPDATE handoff h SET from_user_id = c.user_id FROM candidates c WHERE h.id = c.id;

WITH candidates AS (
    SELECT h.id, min(u.id::text)::uuid AS user_id FROM handoff h
    JOIN website_user u ON u.company_id = h.company_id AND u.name = h.to_name
    GROUP BY h.id HAVING count(*) = 1
)
UPDATE handoff h SET to_user_id = c.user_id FROM candidates c WHERE h.id = c.id;

CREATE INDEX handoff_brief_idx ON handoff (saved_brief_id, id);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM migration_counts WHERE briefs <> (SELECT count(*) FROM saved_brief)
        OR reports <> (SELECT count(*) FROM saved_report) OR tasks <> (SELECT count(*) FROM saved_task)
        OR handoffs <> (SELECT count(*) FROM handoff)) THEN
        RAISE EXCEPTION 'Historical row count changed';
    END IF;
END;
$$;

COMMIT;
