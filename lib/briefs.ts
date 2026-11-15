import sql from './db';
import { ReportSchedule, User } from './types';

export function managesBriefs(user: User) {
    return user.id === user.main_admin_id || user.permissions.reasign_reports === true
        || (user.permissions.see_all_briefs === true && user.permissions.update_brief === true);
}

export async function validateReportAssignment(client: any, company_id: string, report: any) {
    const schedules = report.schedules;
    if (!Array.isArray(schedules) || !schedules.length
        || schedules.some(s => !s || typeof s !== 'object')
        || new Set(schedules.map(s => s.slot_key)).size !== schedules.length
        || schedules.some(s => !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(s.slot_key)
            || !['day', 'week', 'month'].includes(s.once_per)
            || (s.once_per === 'week' ? !Number.isInteger(s.weekday_mask) || s.weekday_mask < 1 || s.weekday_mask > 127 : s.weekday_mask !== null)
            || (s.once_per === 'month' ? !Number.isInteger(s.month_day) || s.month_day < 1 || s.month_day > 31 : s.month_day !== null)
            || !['opening', 'midday', 'closing', 'ongoing'].includes(s.day_time)
            || (s.shift_id !== null && !Number.isInteger(s.shift_id))
            || (s.holder_id !== null && !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(s.holder_id))
            || (s.check_before !== null && !/^(1[0-2]|[1-9]) (AM|PM)$/.test(s.check_before)))) {
        throw Object.assign(new Error('invalid_schedule'), { status: 400 });
    }
    const shifts = [...new Set(schedules.map(s => s.shift_id).filter(id => id !== null))];
    const validShifts = await client.query('SELECT id FROM shift WHERE company_id = $1 AND id = ANY($2::integer[]) AND archived IS NOT TRUE', [company_id, shifts]);
    if (validShifts.rows.length !== shifts.length) throw Object.assign(new Error('invalid_schedule'), { status: 400 });
    const departments = [...new Set<string>(report.assigned_to?.department?.list ?? [])];
    const people = [...new Set<string>([
        ...schedules.map(s => s.holder_id),
        ...(report.archived ? [] : report.assigned_to?.person?.list ?? [])
    ].filter(Boolean))];
    const validPeople = await client.query('SELECT id, department_id FROM website_user WHERE company_id = $1 AND id = ANY($2::uuid[]) AND ($3 OR archived IS NOT TRUE)', [company_id, people, report.archived === true]);
    if (validPeople.rows.length !== people.length) throw Object.assign(new Error('invalid_assignment'), { status: 400 });
    if (report.archived) return;
    const validDepartments = await client.query('SELECT id FROM department WHERE company_id = $1 AND id = ANY($2::uuid[])', [company_id, departments]);
    if (validDepartments.rows.length !== departments.length) {
        throw Object.assign(new Error('invalid_assignment'), { status: 400 });
    }
    const assignedDepartments = report.assigned_to?.all?.assigned
        ? (await client.query('SELECT id FROM department WHERE company_id = $1 AND is_main', [company_id])).rows
        : report.assigned_to?.department?.assigned ? validDepartments.rows : [];
    if (schedules.some(s => s.holder_id && (!assignedDepartments.length
        || assignedDepartments.some((d: any) => d.id !== validPeople.rows.find((p: any) => p.id === s.holder_id)?.department_id)))) {
        throw Object.assign(new Error('invalid_assignment'), { status: 400 });
    }
}

export async function saveReportSchedules(client: any, company_id: string, report_id: number, schedules: ReportSchedule[]) {
    for (const [index, s] of schedules.entries()) {
        const rows = await client.query(`
            INSERT INTO report_schedule (slot_key, report_id, company_id, position, once_per,
                weekday_mask, month_day, day_time, shift_id, holder_id, check_before)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (slot_key) DO UPDATE SET position = EXCLUDED.position, once_per = EXCLUDED.once_per,
                weekday_mask = EXCLUDED.weekday_mask, month_day = EXCLUDED.month_day, day_time = EXCLUDED.day_time,
                shift_id = EXCLUDED.shift_id, holder_id = EXCLUDED.holder_id, check_before = EXCLUDED.check_before
            WHERE report_schedule.report_id = EXCLUDED.report_id AND report_schedule.company_id = EXCLUDED.company_id
            RETURNING slot_key
        `, [s.slot_key, report_id, company_id, index + 1, s.once_per, s.weekday_mask, s.month_day,
            s.day_time, s.shift_id, s.holder_id, s.check_before]);
        if (!rows.rows.length) throw Object.assign(new Error('invalid_schedule'), { status: 400 });
    }
    await client.query('DELETE FROM report_schedule WHERE report_id = $1 AND company_id = $2 AND NOT (slot_key = ANY($3::uuid[]))',
        [report_id, company_id, schedules.map(s => s.slot_key)]);
}

export async function getBriefs(user: User, filters: {
    id?: string | number | null; from?: string | null; to?: string | null; department?: string | null;
}) {
    return sql(`
        SELECT b.*, b.date::text AS date, d.name AS department_name, c.name AS company_name, c.timezone AS company_timezone,
            (SELECT count(*)::integer FROM brief_duty bd WHERE bd.saved_brief_id = b.id) AS duty_count,
            COALESCE((SELECT json_agg(duty ORDER BY duty.started_at, duty.user_id) FROM (
                SELECT bd.*, (SELECT h.to_name FROM handoff h WHERE h.saved_brief_id = b.id
                    AND h.from_user_id = bd.user_id AND h.status = 'accepted' AND bd.ended_at IS NOT NULL
                    ORDER BY h.id DESC LIMIT 1) AS handed_to
                FROM brief_duty bd WHERE bd.saved_brief_id = b.id AND (bd.ended_at IS NULL OR EXISTS (
                    SELECT 1 FROM saved_report sr WHERE sr.saved_brief_id = b.id AND sr.company_id = b.company_id
                        AND sr.holder_id = bd.user_id AND sr.checked AND sr.cancelled_at IS NULL
                ))
            ) duty), '[]'::json) AS duties,
            COALESCE((SELECT json_agg(h ORDER BY h.id) FROM handoff h
                WHERE h.saved_brief_id = b.id AND h.company_id = b.company_id AND h.status = 'pending'), '[]'::json) AS handoffs,
            COALESCE((
                SELECT json_agg(row_to_json(r) ORDER BY r.id)
                FROM (
                    SELECT sr.*,
                        hu.name AS holder_name,
                        cu.name AS completed_by_name
                    FROM saved_report sr
                    LEFT JOIN website_user hu ON hu.id = sr.holder_id AND hu.company_id = sr.company_id
                    LEFT JOIN website_user cu ON cu.id = sr.completed_by AND cu.company_id = sr.company_id
                    WHERE sr.company_id = b.company_id AND sr.cancelled_at IS NULL
                        AND (sr.saved_brief_id = b.id OR EXISTS (
                            SELECT 1 FROM brief_report br WHERE br.saved_brief_id = b.id AND br.saved_report_id = sr.id
                        ))
                ) r
            ), '[]'::json) AS reports,
            COALESCE((SELECT json_agg(st ORDER BY st.id) FROM saved_task st
                WHERE st.saved_brief_id = b.id AND st.company_id = b.company_id), '[]'::json) AS tasks
        FROM saved_brief b
        LEFT JOIN department d ON d.id = b.department_id AND d.company_id = b.company_id
        JOIN company c ON c.id = b.company_id
        WHERE b.company_id = $1 AND ($2::integer IS NULL OR b.id = $2)
            AND ($3::date IS NULL OR b.date >= $3) AND ($4::date IS NULL OR b.date <= $4)
            AND ($5::uuid IS NULL OR b.department_id = $5)
            AND ($6 OR b.department_id = $7 OR (b.date = (now() AT TIME ZONE c.timezone)::date
                AND b.is_department_journal AND (EXISTS (
                    SELECT 1 FROM brief_duty bd WHERE bd.saved_brief_id = b.id AND bd.user_id = $8
                ) OR EXISTS (
                    SELECT 1 FROM handoff h WHERE h.saved_brief_id = b.id
                        AND (h.from_user_id = $8 OR (h.to_user_id = $8 AND h.status = 'pending'))
                        AND h.company_id = b.company_id
                ) OR EXISTS (
                    SELECT 1 FROM saved_report sr WHERE sr.saved_brief_id = b.id
                        AND sr.company_id = b.company_id AND sr.holder_id = $8 AND sr.cancelled_at IS NULL
                ))) OR ($2::integer IS NOT NULL AND EXISTS (
                    SELECT 1 FROM daily_log dl WHERE dl.company_id = b.company_id
                        AND (dl.user_id = $8 OR dl.assigned_to_user_id = $8)
                        AND (dl.saved_brief_id = b.id OR (dl.saved_brief_id IS NULL AND dl.department_id = b.department_id AND dl.date::date = b.date))
                )))
        ORDER BY b.date DESC NULLS LAST, b.lead_name, b.id
    `, [user.company_id, filters.id ?? null, filters.from ?? null, filters.to ?? null,
        filters.department ?? null,
        managesBriefs(user) || user.permissions.see_all_briefs === true || user.permissions.see_dashboard === true,
        user.department_id, user.id]);
}

export const departmentReportCandidates = `
        SELECT b.id AS brief_id, b.date, b.department_id AS brief_department_id,
            r.id, r.company_id, r.name, r.source, r.metric, r.metric_range_from, r.metric_range_to,
            s.slot_key::text, s.position AS slot_position, s.day_time, s.shift_id, sh.name AS shift_name,
            s.holder_id AS planned_holder, s.check_before
        FROM saved_brief b
        JOIN company c ON c.id = b.company_id
        JOIN report r ON r.company_id = b.company_id
        JOIN report_schedule s ON s.report_id = r.id AND s.company_id = r.company_id
        LEFT JOIN shift sh ON sh.id = s.shift_id AND sh.company_id = r.company_id
        WHERE b.company_id = $1 AND b.is_department_journal AND NOT b.freezed
            AND b.date = (now() AT TIME ZONE c.timezone)::date
            AND ($2::integer IS NULL OR r.id = $2) AND ($3::integer IS NULL OR b.id = $3)
            AND r.archived IS NOT TRUE
            AND (r.assigned_to->'all'->>'assigned' = 'true'
                OR (r.assigned_to->'department'->>'assigned' = 'true'
                    AND r.assigned_to->'department'->'list' @> jsonb_build_array(b.department_id::text)))
            AND (s.once_per = 'day'
                OR (s.once_per = 'month' AND s.month_day = EXTRACT(DAY FROM b.date)::int)
                OR (s.once_per = 'week' AND (s.weekday_mask & (1 << EXTRACT(DOW FROM b.date)::int)) <> 0))
    `;
export const departmentCarryoverTasks = `
    SELECT t.id, t.text, t.task_type
    FROM saved_task t JOIN saved_brief b ON b.id = t.saved_brief_id AND b.company_id = t.company_id
    WHERE b.company_id = $2 AND b.department_id = $3 AND b.date = (
        SELECT max(date) FROM saved_brief WHERE company_id = $2 AND department_id = $3 AND date < $4
    ) AND t.checked IS NOT TRUE AND t.roll_to_next_brief = true
`;

export async function ensureDepartmentBrief(client: any, company_id: string, department_id: string, date: string) {
    const company = await client.query(
        "SELECT id FROM company WHERE id = $1 AND $2::date = (now() AT TIME ZONE timezone)::date FOR UPDATE",
        [company_id, date]
    );
    if (!company.rows.length) throw Object.assign(new Error('invalid_start'), { status: 409 });
    const existing = await client.query(`
        SELECT id FROM saved_brief WHERE company_id = $1 AND department_id = $2
            AND date = $3::date AND is_department_journal
    `, [company_id, department_id, date]);
    if (existing.rows.length) return existing.rows[0].id;
    const created = await client.query(`
        INSERT INTO saved_brief (company_id, department_id, date, is_department_journal,
            lead_id, original_lead_id, lead_name, letter, shift_id, shift, started_at,
            freezed, created_at, findings, covered)
        VALUES ($1, $2, $3::date, true, NULL, NULL, '', '', NULL, NULL, NULL, false, clock_timestamp(), '[]', '[]')
        RETURNING id
    `, [company_id, department_id, date]);
    const id = created.rows[0].id;
    await client.query(`
        INSERT INTO saved_task (text, checked, task_type, saved_brief_id, roll_to_next_brief, company_id)
        SELECT t.text, false, t.task_type, $1, true, $2
        FROM (${departmentCarryoverTasks}) t
    `, [id, company_id, department_id, date]);
    await syncDepartmentReports(client, company_id, null, id);
    return id;
}

export async function syncDepartmentReports(client: any, company_id: string, report_id: number | null = null, brief_id: number | null = null) {
    const candidates = departmentReportCandidates;
    const values = [company_id, report_id, brief_id];
    const conflicts = await client.query(`WITH candidates AS (${candidates})
        SELECT sr.id FROM saved_report sr JOIN candidates r ON r.brief_id = sr.saved_brief_id
            AND r.id = sr.report_id AND r.slot_key = sr.slot_key
        WHERE sr.checked IS NOT TRUE AND COALESCE(sr.text, '') <> ''
            AND (COALESCE(sr.metric, 'No Metric') IS DISTINCT FROM COALESCE(r.metric, 'No Metric')
                OR sr.metric_range_from IS DISTINCT FROM r.metric_range_from
                OR sr.metric_range_to IS DISTINCT FROM r.metric_range_to)
    `, values);
    if (conflicts.rows.length) throw Object.assign(new Error('metric_conflict'), { status: 409 });

    await client.query(`WITH candidates AS (${candidates})
        INSERT INTO saved_report (saved_brief_id, report_id, date, department_id, company_id,
            name, source, text, checked, day_time, metric, metric_range_from, metric_range_to,
            holder_id, planned_holder_id, check_before, slot_key, slot_position, shift_id, shift_name)
        SELECT r.brief_id, r.id, r.date, r.brief_department_id, r.company_id,
            r.name, r.source, '', false, r.day_time, r.metric, r.metric_range_from, r.metric_range_to,
            r.planned_holder, r.planned_holder, r.check_before, r.slot_key, r.slot_position, r.shift_id, r.shift_name FROM candidates r
        ON CONFLICT (company_id, department_id, date, report_id, slot_key) DO UPDATE SET
            name = EXCLUDED.name, source = EXCLUDED.source, day_time = EXCLUDED.day_time,
            metric = EXCLUDED.metric, metric_range_from = EXCLUDED.metric_range_from,
            metric_range_to = EXCLUDED.metric_range_to, planned_holder_id = EXCLUDED.planned_holder_id,
            check_before = EXCLUDED.check_before, slot_position = EXCLUDED.slot_position,
            shift_id = EXCLUDED.shift_id, shift_name = EXCLUDED.shift_name, cancelled_at = NULL,
            holder_id = CASE WHEN saved_report.assignment_overridden THEN saved_report.holder_id ELSE EXCLUDED.holder_id END
        WHERE saved_report.checked IS NOT TRUE
    `, values);

    await client.query(`WITH candidates AS (${candidates})
        UPDATE saved_report sr SET cancelled_at = COALESCE(sr.cancelled_at, now())
        FROM saved_brief b JOIN company c ON c.id = b.company_id
        WHERE sr.saved_brief_id = b.id AND sr.company_id = $1 AND b.company_id = $1
            AND b.is_department_journal AND NOT b.freezed AND b.date = (now() AT TIME ZONE c.timezone)::date
            AND ($2::integer IS NULL OR sr.report_id = $2) AND ($3::integer IS NULL OR b.id = $3)
            AND sr.checked IS NOT TRUE AND NOT EXISTS (
                SELECT 1 FROM candidates r WHERE r.brief_id = b.id AND r.id = sr.report_id AND r.slot_key = sr.slot_key
            )
    `, values);
    await client.query(`
        UPDATE saved_brief b SET updated_at = clock_timestamp(),
            reports_reviewed = (SELECT count(*) FROM saved_report r WHERE r.saved_brief_id = b.id AND r.cancelled_at IS NULL AND r.checked),
            reports_all_count = (SELECT count(*) FROM saved_report r WHERE r.saved_brief_id = b.id AND r.cancelled_at IS NULL)
        FROM company c WHERE c.id = b.company_id AND b.company_id = $1 AND b.is_department_journal AND NOT b.freezed
            AND b.date = (now() AT TIME ZONE c.timezone)::date AND ($2::integer IS NULL OR b.id = $2)
            AND ($3::integer IS NULL OR EXISTS (SELECT 1 FROM saved_report r WHERE r.saved_brief_id = b.id AND r.report_id = $3))
    `, [company_id, brief_id, report_id]);
}
