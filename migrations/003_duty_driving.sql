BEGIN;

ALTER TABLE brief_duty ADD COLUMN driving boolean NOT NULL DEFAULT false;

UPDATE saved_brief b SET driving = false
FROM company c
WHERE b.company_id = c.id AND b.is_department_journal AND NOT b.freezed
    AND b.date = (now() AT TIME ZONE c.timezone)::date;

COMMIT;
