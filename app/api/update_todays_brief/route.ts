import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { beforeCheckTime, companyDate } from "@/lib/date";
import { getBriefs, managesBriefs } from "@/lib/briefs";
import { getActionLogCategories } from "@/lib/config";

export async function POST(request: Request) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json();
    const { id, action } = body;
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query("SELECT id FROM company WHERE id = $1 FOR UPDATE", [user.company_id]);
        const rows = await client.query("SELECT *, date::text AS date FROM saved_brief WHERE id = $1 AND company_id = $2 FOR UPDATE", [id, user.company_id]);
        const b = rows.rows[0];
        const manager = managesBriefs(user);
        if (!b) throw Object.assign(new Error("Not found"), { status: 404 });
        if (!b.is_department_journal || b.freezed || b.date !== companyDate(user.timezone)) {
            throw Object.assign(new Error("brief_read_only"), { status: 409 });
        }
        const duties = await client.query("SELECT user_id FROM brief_duty WHERE saved_brief_id = $1 AND user_id = $2 AND ended_at IS NULL", [id, user.id]);
        if (!duties.rows.length && !(manager && ["reassign", "finding", "add_task", "task", "shift", "driving", "add_cover", "cover_driver", "update_cover", "remove_cover"].includes(action))) {
            throw Object.assign(new Error("Forbidden"), { status: 403 });
        }
        const departmentEditor = manager || (user.department_id === b.department_id && user.permissions.update_brief);
        const briefEditor = departmentEditor || (duties.rows.length > 0 && user.permissions.update_brief);
        const reportActions = ["take", "withdraw", "reassign", "value", "complete", "undo"];

        if (reportActions.includes(action)) {
            const reports = await client.query(`
                SELECT * FROM saved_report WHERE saved_brief_id = $1
                    AND company_id = $2 AND cancelled_at IS NULL
                    AND id = $3
                FOR UPDATE
            `, [id, user.company_id, body.report_id]);
            const r = reports.rows[0];
            if (!r) throw Object.assign(new Error("Not found"), { status: 404 });
            const own = r.holder_id === user.id && user.permissions.update_brief;
            if (action === "take") {
                if (!departmentEditor) throw Object.assign(new Error("Forbidden"), { status: 403 });
                if (r.holder_id || r.checked) throw Object.assign(new Error("report_taken"), { status: 409 });
                await client.query("UPDATE saved_report SET holder_id = $1, assignment_overridden = true WHERE id = $2", [user.id, r.id]);
            } else if (action === "reassign") {
                if (!manager) throw Object.assign(new Error("Forbidden"), { status: 403 });
                if (r.checked) throw Object.assign(new Error("report_completed"), { status: 409 });
                const holder_id = body.holder_id || null;
                if (holder_id) {
                    const target = await client.query(`
                        SELECT u.id FROM website_user u JOIN role r ON r.id = u.role_id AND r.company_id = u.company_id
                        JOIN company c ON c.id = u.company_id
                        WHERE u.id = $1 AND u.company_id = $2 AND u.archived IS NOT TRUE
                            AND (u.id = c.main_admin_id OR r.permissions->>'update_brief' = 'true')
                    `, [holder_id, user.company_id]);
                    if (!target.rows.length) throw Object.assign(new Error("invalid_recipient"), { status: 400 });
                }
                await client.query("UPDATE saved_report SET holder_id = $1, assignment_overridden = true WHERE id = $2", [holder_id, r.id]);
            } else {
                if (!own && !manager) throw Object.assign(new Error("Forbidden"), { status: 403 });
                if (action === "undo") {
                    if (!r.checked) throw Object.assign(new Error("report_changed"), { status: 409 });
                    await client.query("UPDATE saved_report SET checked = false, timestamp = NULL, completed_by = NULL WHERE id = $1", [r.id]);
                } else {
                    if (r.checked) throw Object.assign(new Error("report_completed"), { status: 409 });
                    if (action === "withdraw") {
                        await client.query("UPDATE saved_report SET holder_id = NULL, assignment_overridden = true WHERE id = $1", [r.id]);
                    } else {
                        if (user.id !== user.main_admin_id && !user.permissions.reasign_reports
                            && !beforeCheckTime(r.check_before, user.timezone)) {
                            throw Object.assign(new Error("report_overdue"), { status: 409 });
                        }
                        const text = body.text;
                        if (typeof text !== "string") throw Object.assign(new Error("invalid_value"), { status: 400 });
                        const metric = (r.metric ?? "No Metric").toLowerCase();
                        if (action === "complete" && metric !== "no metric" && !text.trim()) {
                            throw Object.assign(new Error("input_report_value_first"), { status: 400 });
                        }
                        if (text && (metric === "metric" || metric === "count")
                            && (!Number.isFinite(Number(text)) || (metric === "metric"
                                && ((r.metric_range_from != null && Number(text) < r.metric_range_from)
                                    || (r.metric_range_to != null && Number(text) > r.metric_range_to))))) {
                            throw Object.assign(new Error("invalid_value"), { status: 400 });
                        }
                        if (text && metric === "yes/no" && text !== "Yes" && text !== "No") {
                            throw Object.assign(new Error("invalid_value"), { status: 400 });
                        }
                        await client.query(`
                            UPDATE saved_report SET text = $1, checked = $2,
                                timestamp = CASE WHEN $2 THEN clock_timestamp() ELSE NULL END,
                                completed_by = CASE WHEN $2 THEN $3::uuid ELSE NULL END
                            WHERE id = $4
                        `, [text, action === "complete", user.id, r.id]);
                    }
                }
            }
        } else {
            if (!briefEditor) throw Object.assign(new Error("Forbidden"), { status: 403 });
            if (action === "notes") {
                await client.query("UPDATE saved_brief SET notes = $1 WHERE id = $2", [body.notes, id]);
            } else if (action === "driving") {
                const targetUserId = (manager && body.user_id) ? body.user_id : user.id;
                await client.query("UPDATE brief_duty SET driving = $1 WHERE saved_brief_id = $2 AND user_id = $3", [body.driving === true, id, targetUserId]);
            } else if (action === "shift") {
                if (!manager && !user.permissions.update_brief) throw Object.assign(new Error("Forbidden"), { status: 403 });
                const shift = await client.query("SELECT id, name FROM shift WHERE id = $1 AND company_id = $2 AND archived IS NOT TRUE", [body.shift_id, user.company_id]);
                if (!shift.rows.length) throw Object.assign(new Error("invalid_recipient"), { status: 400 });
                const targetUserId = (manager && body.user_id) ? body.user_id : user.id;
                await client.query("UPDATE brief_duty SET shift_id = $1, shift = $2 WHERE saved_brief_id = $3 AND user_id = $4", [shift.rows[0].id, shift.rows[0].name, id, targetUserId]);
                await client.query("UPDATE saved_brief SET shift_id = $1, shift = $2 WHERE id = $3 AND lead_id = $4", [shift.rows[0].id, shift.rows[0].name, id, targetUserId]);
            } else if (action === "add_task") {
                const t = body.task;
                await client.query(`
                    INSERT INTO saved_task (id, text, task_type, checked, roll_to_next_brief, saved_brief_id, company_id)
                    VALUES ($1, $2, $3, false, $4, $5, $6) ON CONFLICT (id) DO NOTHING
                `, [t.id, t.text, t.task_type, t.roll_to_next_brief === true, id, user.company_id]);
            } else if (action === "task") {
                const t = body.task;
                const changed = await client.query(`
                    UPDATE saved_task SET checked = COALESCE($1::boolean, checked),
                        roll_to_next_brief = COALESCE($2::boolean, roll_to_next_brief)
                    WHERE id = $3
                        AND saved_brief_id = $4 AND company_id = $5 RETURNING id
                `, [t.checked ?? null, t.roll_to_next_brief ?? null, t.id, id, user.company_id]);
                if (!changed.rows.length) throw Object.assign(new Error("Not found"), { status: 404 });
            } else if (action === "add_cover" || action === "cover_driver" || action === "update_cover") {
                const cover = body.cover ?? {};
                const coverId = action === "cover_driver" ? body.cover_id : cover.id;
                const driver_id = action === "cover_driver" ? body.driver_id : cover.driver_id;
                if (!driver_id) throw Object.assign(new Error("invalid_driver"), { status: 409 });
                if (!manager && (driver_id !== user.id || ((action === "cover_driver" || action === "update_cover")
                    && !b.covered.some((c: any) => c.id === coverId && c.driver_id === user.id)))) {
                    throw Object.assign(new Error("Forbidden"), { status: 403 });
                }
                const drivers = await client.query("SELECT name FROM brief_duty WHERE saved_brief_id = $1 AND user_id = $2 AND driving AND ended_at IS NULL", [id, driver_id]);
                if (!drivers.rows.length) throw Object.assign(new Error("invalid_driver"), { status: 409 });
                if (action === "add_cover") {
                    const newCover = {...cover, driver_name: drivers.rows[0].name};
                    await client.query(`
                        UPDATE saved_brief SET covered = COALESCE(covered, '[]') || $1::jsonb
                        WHERE id = $2 AND NOT COALESCE(covered, '[]') @> $3::jsonb
                    `, [JSON.stringify([newCover]), id, JSON.stringify([{ id: newCover.id }])]);
                } else if (action === "cover_driver") {
                    const changed = await client.query(`
                        UPDATE saved_brief SET covered = (
                            SELECT jsonb_agg(CASE WHEN item->>'id' = $1 THEN item || $2::jsonb ELSE item END ORDER BY position)
                            FROM jsonb_array_elements(covered) WITH ORDINALITY entries(item, position)
                        ) WHERE id = $3 AND covered @> $4::jsonb RETURNING id
                    `, [coverId, JSON.stringify({driver_id, driver_name: drivers.rows[0].name}), id, JSON.stringify([{id: coverId}])]);
                    if (!changed.rows.length) throw Object.assign(new Error("Not found"), { status: 404 });
                } else if (action === "update_cover") {
                    const updatedCover = {
                        ...cover,
                        driver_id,
                        driver_name: drivers.rows[0].name,
                        stops: Number(cover.stops) || 0
                    };
                    const changed = await client.query(`
                        UPDATE saved_brief SET covered = (
                            SELECT jsonb_agg(CASE WHEN item->>'id' = $1 THEN item || $2::jsonb ELSE item END ORDER BY position)
                            FROM jsonb_array_elements(covered) WITH ORDINALITY entries(item, position)
                        ) WHERE id = $3 AND covered @> $4::jsonb RETURNING id
                    `, [coverId, JSON.stringify(updatedCover), id, JSON.stringify([{id: coverId}])]);
                    if (!changed.rows.length) throw Object.assign(new Error("Not found"), { status: 404 });
                }
            } else if (action === "remove_cover") {
                if (!manager && !b.covered.some((cover: any) => cover.id === body.cover_id && cover.driver_id === user.id)) {
                    throw Object.assign(new Error("Forbidden"), { status: 403 });
                }
                await client.query(`
                    UPDATE saved_brief SET covered = COALESCE((
                        SELECT jsonb_agg(item) FROM jsonb_array_elements(COALESCE(covered, '[]')) item WHERE item->>'id' <> $1
                    ), '[]') WHERE id = $2
                `, [body.cover_id, id]);
            } else if (action === "finding") {
                const f = body.finding ?? {};
                const description = typeof f.description === "string" ? f.description.trim() : "";
                if (!f.id || !["info", "moderate", "high"].includes(f.type) || !description) {
                    throw Object.assign(new Error("invalid_value"), { status: 400 });
                }
                const sendToTracker = f.send_to_action_tracker === true;
                let category: string | undefined;
                let assignedToUserId: string | null = null;
                let actionTrackerId: string | null = null;
                if (sendToTracker) {
                    const validCategories = getActionLogCategories().map(c => c.name);
                    if (!validCategories.includes(f.category)) {
                        throw Object.assign(new Error("invalid_value"), { status: 400 });
                    }
                    category = f.category;
                    if (f.assigned_to_user_id) {
                        const assignee = await client.query(
                            "SELECT id FROM website_user WHERE id = $1 AND company_id = $2 AND archived IS NOT TRUE",
                            [f.assigned_to_user_id, user.company_id]
                        );
                        if (!assignee.rows.length) {
                            throw Object.assign(new Error("invalid_value"), { status: 400 });
                        }
                        assignedToUserId = assignee.rows[0].id;
                    }
                    actionTrackerId = crypto.randomUUID();
                }
                const finding = {
                    id: String(f.id),
                    type: f.type,
                    description,
                    created_at: new Date().toISOString(),
                    user_id: user.id,
                    ...(sendToTracker ? {
                        category,
                        assigned_to_user_id: assignedToUserId,
                        action_tracker_id: actionTrackerId
                    } : {})
                };
                const updatedBrief = await client.query(`
                    UPDATE saved_brief SET findings = COALESCE(findings, '[]') || $1::jsonb
                    WHERE id = $2 AND NOT COALESCE(findings, '[]') @> $3::jsonb
                    RETURNING id
                `, [JSON.stringify([finding]), id, JSON.stringify([{ id: finding.id }])]);
                if (sendToTracker && updatedBrief.rows.length > 0) {
                    const severityMap: Record<string, string> = { info: "Low", moderate: "Med", high: "High" };
                    const dutyShift = (await client.query(
                        "SELECT shift FROM brief_duty WHERE saved_brief_id = $1 AND user_id = $2 ORDER BY ended_at NULLS FIRST, started_at DESC LIMIT 1",
                        [id, user.id]
                    )).rows[0]?.shift ?? b.shift ?? "-";
                    await client.query(`
                        INSERT INTO daily_log (
                            id, date, user_id, assigned_to_user_id, department_id, shift,
                            category, severity, text, status, actions, date_resolved,
                            company_id, saved_brief_id, finding_id
                        )
                        VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8, $9, 'Unset', '[]'::jsonb, NULL, $10, $11, $12)
                        ON CONFLICT (company_id, saved_brief_id, finding_id) WHERE finding_id IS NOT NULL DO NOTHING
                    `, [
                        actionTrackerId,
                        b.date,
                        user.id,
                        assignedToUserId,
                        b.department_id,
                        dutyShift,
                        category,
                        severityMap[f.type],
                        description,
                        user.company_id,
                        id,
                        finding.id
                    ]);
                    if (assignedToUserId && assignedToUserId !== user.id) {
                        const briefDateParam = b.date ? `&date=${b.date.split("-").reverse().join("-")}` : "";
                        const briefUrl = `/daily-brief?brief_id=${id}&finding_id=${finding.id}${briefDateParam}&department_id=${b.department_id}`;
                        await client.query(`
                            INSERT INTO chat (from_user, to_user, text, read, timestamp, company_id)
                            VALUES ($1, $2, $3, false, clock_timestamp(), $4)
                        `, [
                            user.id,
                            assignedToUserId,
                            `INFO: ${user.name} assigned an Action Tracker issue to you (${category}, ${severityMap[f.type]}): ${description} ${briefUrl}`,
                            user.company_id
                        ]);
                    }
                }
            } else if (action === "submit") {
                const reports = await client.query(`
                    SELECT id, name, check_before, day_time, shift_name FROM saved_report WHERE saved_brief_id = $1
                        AND company_id = $2 AND cancelled_at IS NULL AND checked IS NOT TRUE ORDER BY id
                `, [id, user.company_id]);
                if (reports.rows.length) {
                    const pending = reports.rows.filter((r: any) => beforeCheckTime(r.check_before, user.timezone));
                    const overdue = reports.rows.filter((r: any) => !beforeCheckTime(r.check_before, user.timezone));
                    await client.query("ROLLBACK");
                    return NextResponse.json({ error: "day_incomplete", pending, overdue }, { status: 409 });
                }
                await client.query("UPDATE saved_brief SET freezed = true, closed_at = clock_timestamp(), closed_by = $1 WHERE id = $2", [user.id, id]);
            } else {
                throw Object.assign(new Error("invalid_action"), { status: 400 });
            }
        }
        await client.query(`
            UPDATE saved_brief SET updated_at = clock_timestamp(),
                driving = EXISTS (SELECT 1 FROM brief_duty WHERE saved_brief_id = $1 AND driving AND ended_at IS NULL),
                reports_reviewed = (SELECT count(*) FROM saved_report WHERE saved_brief_id = $1 AND cancelled_at IS NULL AND checked = true),
                reports_all_count = (SELECT count(*) FROM saved_report WHERE saved_brief_id = $1 AND cancelled_at IS NULL)
            WHERE id = $1
        `, [id]);
        await client.query("COMMIT");
        const briefs = await getBriefs(user, { id });
        return NextResponse.json({ success: true, brief: briefs[0] });
    } catch (error: any) {
        await client.query("ROLLBACK");
        console.error(error);
        return NextResponse.json({ error: error.status ? error.message : "Database error" }, { status: error.status ?? 500 });
    } finally {
        client.release();
    }
}