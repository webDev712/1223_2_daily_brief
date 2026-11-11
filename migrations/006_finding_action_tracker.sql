BEGIN;

LOCK TABLE daily_log IN SHARE ROW EXCLUSIVE MODE;

ALTER TABLE daily_log
    ADD COLUMN IF NOT EXISTS assigned_to_user_id uuid REFERENCES website_user(id),
    ADD COLUMN IF NOT EXISTS saved_brief_id integer REFERENCES saved_brief(id),
    ADD COLUMN IF NOT EXISTS finding_id text;

UPDATE daily_log
SET severity = 'Low'
WHERE severity = 'info';

CREATE UNIQUE INDEX IF NOT EXISTS daily_log_brief_finding_unique
    ON daily_log (company_id, saved_brief_id, finding_id)
    WHERE finding_id IS NOT NULL;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM daily_log WHERE severity = 'info') THEN
        RAISE EXCEPTION 'Legacy info severity rows remain in daily_log';
    END IF;
END;
$$;

COMMIT;
