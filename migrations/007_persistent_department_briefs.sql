BEGIN;

ALTER TABLE saved_brief DROP CONSTRAINT saved_brief_journal_state_check;

ALTER TABLE saved_brief ADD CONSTRAINT saved_brief_journal_state_check CHECK (
    NOT is_department_journal OR (company_id IS NOT NULL AND department_id IS NOT NULL
        AND date IS NOT NULL AND freezed IS NOT NULL
        AND ((lead_id IS NULL AND shift_id IS NULL AND started_at IS NULL AND NOT freezed)
            OR (lead_id IS NOT NULL AND shift_id IS NOT NULL AND started_at IS NOT NULL))
        AND (NOT freezed OR (closed_at IS NOT NULL AND closed_by IS NOT NULL)))
);

COMMIT;
