BEGIN;

LOCK TABLE saved_brief IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE brief_duty (
    saved_brief_id integer NOT NULL REFERENCES saved_brief(id),
    user_id uuid NOT NULL REFERENCES website_user(id),
    name text NOT NULL,
    shift_id integer NOT NULL REFERENCES shift(id),
    shift text NOT NULL,
    started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (saved_brief_id, user_id)
);

INSERT INTO brief_duty (saved_brief_id, user_id, name, shift_id, shift, started_at)
SELECT id, lead_id, lead_name, shift_id, shift, started_at
FROM saved_brief WHERE is_department_journal;

COMMIT;
