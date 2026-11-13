import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { companyDate } from "@/lib/date";
import { managesBriefs } from "@/lib/briefs";

export async function PATCH(request: Request) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
        brief_id,
        action = "request",
        handoff_id,
        shift_id,
        decline_reason,
        new_lead_id,
        reason,
        notes,
        from_user_id,
        reports_only
    } = body;

    const client = await pool.connect();

    try {
        await client.query("BEGIN");
        await client.query("SELECT id FROM company WHERE id = $1 FOR UPDATE", [user.company_id]);
        const manager = managesBriefs(user);
        const today = companyDate(user.timezone);
        const loadBrief = async (id: number) => (await client.query(`
            SELECT b.*, b.date::text AS date, (SELECT name FROM department WHERE id = b.department_id) AS department_name
            FROM saved_brief b
            WHERE b.id = $1 AND b.company_id = $2 FOR UPDATE
        `, [id, user.company_id])).rows[0];
        const loadRecipient = async () => (await client.query(`
            SELECT u.id, u.name, u.lead_letter FROM website_user u
            LEFT JOIN role r ON r.id = u.role_id AND r.company_id = u.company_id
            JOIN company c ON c.id = u.company_id
            WHERE u.id = $1 AND u.company_id = $2 AND u.archived IS NOT TRUE
                AND (u.id = c.main_admin_id OR r.permissions->>'update_brief' = 'true')
        `, [new_lead_id, user.company_id])).rows[0];
        const loadShift = async () => shift_id ? (await client.query(
            "SELECT id, name FROM shift WHERE id = $1 AND company_id = $2 AND archived IS NOT TRUE",
            [shift_id, user.company_id]
        )).rows[0] : undefined;

        const b = await loadBrief(brief_id);
        if (!b) throw Object.assign(new Error("Not found"), { status: 404 });
        const actualBriefId = b.id;
        const briefDateParam = b.date ? `&date=${b.date.split("-").reverse().join("-")}` : "";
        const briefUrl = `/daily-brief?department_id=${b.department_id}&brief_id=${actualBriefId}${briefDateParam}`;

        if (!b.is_department_journal || b.freezed || b.date !== today) {
            throw Object.assign(new Error("brief_read_only"), { status: 409 });
        }

        if (action === "request") {
            const senderDutyRes = await client.query(
                "SELECT * FROM brief_duty WHERE saved_brief_id = $1 AND user_id = $2 AND ended_at IS NULL",
                [actualBriefId, user.id]
            );
            if (!senderDutyRes.rows.length) {
                throw Object.assign(new Error("Forbidden"), { status: 403 });
            }
            const senderDuty = senderDutyRes.rows[0];

            const pendingRes = await client.query(
                "SELECT id FROM handoff WHERE saved_brief_id = $1 AND from_user_id = $2 AND status = 'pending'",
                [actualBriefId, user.id]
            );
            if (pendingRes.rows.length) {
                throw Object.assign(new Error("handoff_pending"), { status: 409 });
            }

            if (!new_lead_id || new_lead_id === user.id) {
                throw Object.assign(new Error("invalid_recipient"), { status: 400 });
            }

            const recipientRes = await client.query(`
                SELECT u.id, u.name FROM website_user u
                LEFT JOIN role r ON r.id = u.role_id AND r.company_id = u.company_id
                JOIN company c ON c.id = u.company_id
                WHERE u.id = $1 AND u.company_id = $2 AND u.archived IS NOT TRUE
                    AND (u.id = c.main_admin_id OR r.permissions->>'update_brief' = 'true')
            `, [new_lead_id, user.company_id]);
            if (!recipientRes.rows.length) {
                throw Object.assign(new Error("invalid_recipient"), { status: 400 });
            }
            const recipient = recipientRes.rows[0];

            const handoffRes = await client.query(`
                INSERT INTO handoff (
                    saved_brief_id, company_id, date, from_user_id, to_user_id,
                    from_name, to_name, from_shift_id, from_shift_name,
                    reason, notes, status, requested_at
                )
                VALUES ($1, $2, $3::date, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', clock_timestamp())
                RETURNING id
            `, [
                actualBriefId, user.company_id, b.date, user.id, recipient.id,
                user.name, recipient.name, senderDuty.shift_id, senderDuty.shift,
                reason || null, notes || null
            ]);

            await client.query(`
                INSERT INTO chat (from_user, to_user, text, read, timestamp, company_id)
                VALUES ($1, $2, $3, false, clock_timestamp(), $4)
            `, [
                user.id,
                recipient.id,
                `INFO: ${user.name} sent you a Handoff request for ${b.department_name ?? 'department'} brief. Please review and accept or decline. ${briefUrl}`,
                user.company_id
            ]);

            await client.query("COMMIT");
            return NextResponse.json({ success: true, handoff_id: handoffRes.rows[0].id });
        } else if (action === "decline") {
            if (!handoff_id) throw Object.assign(new Error("invalid_action"), { status: 400 });
            if (!decline_reason || !decline_reason.trim()) {
                throw Object.assign(new Error("decline_reason_required"), { status: 400 });
            }

            const hRes = await client.query(
                "SELECT * FROM handoff WHERE id = $1 AND saved_brief_id = $2 AND company_id = $3 FOR UPDATE",
                [handoff_id, actualBriefId, user.company_id]
            );
            const h = hRes.rows[0];
            if (!h || h.status !== 'pending' || h.to_user_id !== user.id) {
                throw Object.assign(new Error("handoff_changed"), { status: 409 });
            }

            await client.query(`
                UPDATE handoff
                SET status = 'declined', responded_at = clock_timestamp(), decline_reason = $1
                WHERE id = $2
            `, [decline_reason.trim(), handoff_id]);

            await client.query(`
                INSERT INTO chat (from_user, to_user, text, read, timestamp, company_id)
                VALUES ($1, $2, $3, false, clock_timestamp(), $4)
            `, [
                user.id,
                h.from_user_id,
                `INFO: ${user.name} declined your Handoff request for ${b.department_name ?? 'department'} brief: "${decline_reason.trim()}". ${briefUrl}`,
                user.company_id
            ]);

            await client.query("COMMIT");
            return NextResponse.json({ success: true });
        } else if (action === "accept") {
            if (!handoff_id) throw Object.assign(new Error("invalid_action"), { status: 400 });

            const hRes = await client.query(
                "SELECT * FROM handoff WHERE id = $1 AND saved_brief_id = $2 AND company_id = $3 FOR UPDATE",
                [handoff_id, actualBriefId, user.company_id]
            );
            const h = hRes.rows[0];
            if (!h || h.status !== 'pending' || h.to_user_id !== user.id) {
                throw Object.assign(new Error("handoff_changed"), { status: 409 });
            }

            await client.query(`
                UPDATE saved_report
                SET holder_id = $1, assignment_overridden = true
                WHERE saved_brief_id = $2 AND holder_id = $3 AND checked IS NOT TRUE AND cancelled_at IS NULL
            `, [user.id, actualBriefId, h.from_user_id]);

            await client.query(`
                UPDATE brief_duty
                SET ended_at = clock_timestamp(), driving = false
                WHERE saved_brief_id = $1 AND user_id = $2 AND ended_at IS NULL
            `, [actualBriefId, h.from_user_id]);

            const recipientDutyRes = await client.query(
                "SELECT * FROM brief_duty WHERE saved_brief_id = $1 AND user_id = $2 AND ended_at IS NULL",
                [actualBriefId, user.id]
            );
            let recipientShiftId = null;
            let recipientShiftName = null;

            if (recipientDutyRes.rows.length) {
                recipientShiftId = recipientDutyRes.rows[0].shift_id;
                recipientShiftName = recipientDutyRes.rows[0].shift;
            } else {
                let newShiftId = shift_id ?? h.from_shift_id;
                let newShiftName = h.from_shift_name;
                if (shift_id) {
                    const sRes = await client.query(
                        "SELECT id, name FROM shift WHERE id = $1 AND company_id = $2 AND archived IS NOT TRUE",
                        [shift_id, user.company_id]
                    );
                    if (sRes.rows.length) {
                        newShiftId = sRes.rows[0].id;
                        newShiftName = sRes.rows[0].name;
                    }
                }
                await client.query(`
                    INSERT INTO brief_duty (saved_brief_id, user_id, name, shift_id, shift, driving, started_at)
                    VALUES ($1, $2, $3, $4, $5, false, clock_timestamp())
                    ON CONFLICT (saved_brief_id, user_id) DO UPDATE
                    SET ended_at = NULL, shift_id = EXCLUDED.shift_id, shift = EXCLUDED.shift, driving = false, started_at = clock_timestamp()
                `, [actualBriefId, user.id, user.name, newShiftId, newShiftName]);
                recipientShiftId = newShiftId;
                recipientShiftName = newShiftName;
            }

            await client.query(`
                UPDATE handoff
                SET status = 'accepted', responded_at = clock_timestamp(), transferred_at = clock_timestamp(),
                    to_shift_id = $1, to_shift_name = $2
                WHERE id = $3
            `, [recipientShiftId, recipientShiftName, handoff_id]);

            await client.query(`
                UPDATE saved_brief SET updated_at = clock_timestamp(),
                    driving = EXISTS (SELECT 1 FROM brief_duty WHERE saved_brief_id = $1 AND driving AND ended_at IS NULL)
                WHERE id = $1
            `, [actualBriefId]);

            await client.query(`
                INSERT INTO chat (from_user, to_user, text, read, timestamp, company_id)
                VALUES ($1, $2, $3, false, clock_timestamp(), $4)
            `, [
                user.id,
                h.from_user_id,
                `INFO: ${user.name} accepted your Handoff request for ${b.department_name ?? 'department'} brief. Shift and reports have been transferred. ${briefUrl}`,
                user.company_id
            ]);

            await client.query("COMMIT");
            return NextResponse.json({ success: true });
        } else if (action === "direct_transfer") {
            if (!manager) {
                throw Object.assign(new Error("Forbidden"), { status: 403 });
            }

            const sourceUserId = from_user_id;
            if (!sourceUserId || !new_lead_id || sourceUserId === new_lead_id) {
                throw Object.assign(new Error("invalid_recipient"), { status: 400 });
            }

            const fromUserRes = await client.query(
                "SELECT id, name FROM website_user WHERE id = $1 AND company_id = $2",
                [sourceUserId, user.company_id]
            );
            if (!fromUserRes.rows.length) throw Object.assign(new Error("invalid_recipient"), { status: 400 });
            const fromUser = fromUserRes.rows[0];

            const toUser = await loadRecipient();
            if (!toUser) throw Object.assign(new Error("invalid_recipient"), { status: 400 });

            const fromDuty = (await client.query(
                "SELECT * FROM brief_duty WHERE saved_brief_id = $1 AND user_id = $2 AND ended_at IS NULL",
                [actualBriefId, sourceUserId]
            )).rows[0];
            const toDuty = (await client.query(
                "SELECT * FROM brief_duty WHERE saved_brief_id = $1 AND user_id = $2 AND ended_at IS NULL",
                [actualBriefId, toUser.id]
            )).rows[0];

            const reportsOnly = !fromDuty && !toDuty && !shift_id;
            if (reports_only && !reportsOnly) throw Object.assign(new Error("handoff_changed"), { status: 409 });
            const toShift = (shift_id ? await loadShift() : undefined) ?? (toDuty ? { id: toDuty.shift_id, name: toDuty.shift } : undefined);
            if (!reportsOnly && !toShift) throw Object.assign(new Error("shift_required"), { status: 400 });

            const moved = await client.query(`
                UPDATE saved_report
                SET holder_id = $1, assignment_overridden = true
                WHERE saved_brief_id = $2 AND holder_id = $3 AND checked IS NOT TRUE AND cancelled_at IS NULL
            `, [toUser.id, actualBriefId, sourceUserId]);
            if (!moved.rowCount && !fromDuty) {
                throw Object.assign(new Error("nothing_to_transfer"), { status: 409 });
            }

            if (reportsOnly) {
                await client.query("UPDATE saved_brief SET updated_at = clock_timestamp() WHERE id = $1", [actualBriefId]);
            } else {
                if (fromDuty) {
                    await client.query(`
                        UPDATE brief_duty
                        SET ended_at = clock_timestamp(), driving = false
                        WHERE saved_brief_id = $1 AND user_id = $2 AND ended_at IS NULL
                    `, [actualBriefId, sourceUserId]);
                }

                if (!toDuty) {
                    await client.query(`
                        INSERT INTO brief_duty (saved_brief_id, user_id, name, shift_id, shift, driving, started_at)
                        VALUES ($1, $2, $3, $4, $5, false, clock_timestamp())
                        ON CONFLICT (saved_brief_id, user_id) DO UPDATE
                        SET ended_at = NULL, name = EXCLUDED.name, shift_id = EXCLUDED.shift_id, shift = EXCLUDED.shift, driving = false, started_at = clock_timestamp()
                    `, [actualBriefId, toUser.id, toUser.name, toShift.id, toShift.name]);
                } else if (shift_id) {
                    await client.query(`
                        UPDATE brief_duty SET shift_id = $1, shift = $2
                        WHERE saved_brief_id = $3 AND user_id = $4 AND ended_at IS NULL
                    `, [toShift.id, toShift.name, actualBriefId, toUser.id]);
                }

                await client.query(`
                    UPDATE handoff SET status = 'declined', responded_at = clock_timestamp(), decline_reason = 'Cancelled by manager transfer'
                    WHERE saved_brief_id = $1 AND from_user_id = $2 AND status = 'pending'
                `, [actualBriefId, sourceUserId]);

                await client.query(`
                    INSERT INTO handoff (
                        saved_brief_id, company_id, date, from_user_id, to_user_id,
                        from_name, to_name, from_shift_id, from_shift_name, to_shift_id, to_shift_name,
                        reason, notes, status, requested_at, responded_at, transferred_at
                    )
                    VALUES ($1, $2, $3::date, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'accepted', clock_timestamp(), clock_timestamp(), clock_timestamp())
                `, [
                    actualBriefId, user.company_id, b.date, sourceUserId, toUser.id,
                    fromUser.name, toUser.name, fromDuty?.shift_id ?? null, fromDuty?.shift ?? null, toShift.id, toShift.name,
                    reason || null, notes || `Transferred by Manager ${user.name}`
                ]);

                await client.query(`
                    UPDATE saved_brief SET updated_at = clock_timestamp(),
                        lead_id = CASE WHEN started_at IS NULL THEN $2 ELSE lead_id END,
                        original_lead_id = CASE WHEN started_at IS NULL THEN $2 ELSE original_lead_id END,
                        lead_name = CASE WHEN started_at IS NULL THEN $3 ELSE lead_name END,
                        letter = CASE WHEN started_at IS NULL THEN $4 ELSE letter END,
                        shift_id = CASE WHEN started_at IS NULL THEN $5 ELSE shift_id END,
                        shift = CASE WHEN started_at IS NULL THEN $6 ELSE shift END,
                        started_at = COALESCE(started_at, clock_timestamp()),
                        driving = EXISTS (SELECT 1 FROM brief_duty WHERE saved_brief_id = $1 AND driving AND ended_at IS NULL)
                    WHERE id = $1
                `, [actualBriefId, toUser.id, toUser.name, toUser.lead_letter || '', toShift.id, toShift.name]);
            }

            const fromName = fromUser.name ? fromUser.name.trim() : "";
            const toName = toUser.name ? toUser.name.trim() : "";
            const toMessage = `INFO: Manager ${user.name} transferred ${fromName}'s ${reportsOnly ? 'reports' : 'shift and reports'} to you in ${b.department_name ?? 'department'} brief. ${briefUrl}`;
            await client.query(`
                INSERT INTO chat (from_user, to_user, text, read, timestamp, company_id)
                VALUES ($1, $2, $3, false, clock_timestamp(), $4)
            `, [user.id, toUser.id, toMessage, user.company_id]);

            if (sourceUserId !== user.id) {
                const fromMessage = `INFO: Manager ${user.name} transferred your ${reportsOnly ? 'reports' : 'shift and reports'} to ${toName} in ${b.department_name ?? 'department'} brief. ${briefUrl}`;
                await client.query(`
                    INSERT INTO chat (from_user, to_user, text, read, timestamp, company_id)
                    VALUES ($1, $2, $3, false, clock_timestamp(), $4)
                `, [user.id, sourceUserId, fromMessage, user.company_id]);
            }

            await client.query("COMMIT");
            return NextResponse.json({ success: true, brief_id: actualBriefId });
        } else {
            throw Object.assign(new Error("invalid_action"), { status: 400 });
        }
    } catch (error: any) {
        await client.query("ROLLBACK");
        console.error(error);
        return NextResponse.json(
            { error: error.status ? error.message : "Database error" },
            { status: error.status ?? 500 }
        );
    } finally {
        client.release();
    }
}