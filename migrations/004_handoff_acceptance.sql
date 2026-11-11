BEGIN;

ALTER TABLE brief_duty ADD COLUMN ended_at timestamptz;

ALTER TABLE handoff
    ADD COLUMN status text NOT NULL DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted', 'declined')),
    ADD COLUMN requested_at timestamptz,
    ADD COLUMN responded_at timestamptz,
    ADD COLUMN decline_reason text;

INSERT INTO brief_duty (saved_brief_id, user_id, name, shift_id, shift, started_at, ended_at)
SELECT DISTINCT ON (h.saved_brief_id, h.from_user_id)
    h.saved_brief_id, h.from_user_id, h.from_name, h.from_shift_id, h.from_shift_name,
    b.started_at, h.transferred_at
FROM handoff h JOIN saved_brief b ON b.id = h.saved_brief_id AND b.company_id = h.company_id
WHERE b.is_department_journal AND h.from_user_id <> h.to_user_id
    AND h.from_shift_id IS NOT NULL AND h.from_shift_name IS NOT NULL AND h.transferred_at IS NOT NULL
    AND EXISTS (SELECT 1 FROM saved_report r WHERE r.saved_brief_id = b.id
        AND r.company_id = b.company_id AND r.holder_id = h.from_user_id AND r.checked AND r.cancelled_at IS NULL)
ORDER BY h.saved_brief_id, h.from_user_id, h.id DESC
ON CONFLICT (saved_brief_id, user_id) DO NOTHING;

COMMIT;
