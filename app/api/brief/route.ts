import { NextResponse } from "next/server";
import sql, { pool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { companyDate } from "@/lib/date";
import { ensureDepartmentBrief, getBriefs, managesBriefs } from "@/lib/briefs";

export async function GET(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const { searchParams } = new URL(request.url);
        const department_id = searchParams.get("department_id");
        const date = searchParams.get("date");
        if (!searchParams.get("id") && department_id) {
            if (date !== companyDate(user.timezone)) return NextResponse.json({ error: "invalid_start" }, { status: 409 });
            const existing = (await getBriefs(user, {department: department_id, from: date, to: date}))
                .filter((b: any) => b.is_department_journal);
            if (existing.length) return NextResponse.json(existing);
            const department = await sql(`
                SELECT d.id, d.name, c.name AS company_name, c.timezone AS company_timezone
                FROM department d JOIN company c ON c.id = d.company_id
                WHERE d.company_id = $1 AND d.id = $2 AND d.is_main
                    AND ($3 OR d.id = $4)
            `, [user.company_id, department_id,
                managesBriefs(user) || user.permissions.see_all_briefs === true || user.permissions.see_dashboard === true,
                user.department_id]);
            if (!department.length) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            const client = await pool.connect();
            let id: number;
            try {
                await client.query("BEGIN");
                id = await ensureDepartmentBrief(client, user.company_id, department_id, date);
                await client.query("COMMIT");
            } catch (error) {
                await client.query("ROLLBACK");
                throw error;
            } finally {
                client.release();
            }
            return NextResponse.json(await getBriefs(user, {id}));
        }
        const rows = await getBriefs(user, { id: searchParams.get("id") });
        return NextResponse.json(rows);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { department_id, shift_id, date } = await request.json();
    if (!department_id || !shift_id || date !== companyDate(user.timezone)) {
        return NextResponse.json({ error: "invalid_start" }, { status: 409 });
    }
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await client.query("SELECT id FROM company WHERE id = $1 FOR UPDATE", [user.company_id]);
        if (date !== companyDate(user.timezone)) throw Object.assign(new Error("invalid_start"), { status: 409 });
        const department = await client.query(
            "SELECT id FROM department WHERE id = $1 AND company_id = $2 AND is_main = true",
            [department_id, user.company_id]
        );
        const shift = await client.query(
            "SELECT id, name FROM shift WHERE id = $1 AND company_id = $2 AND archived IS NOT TRUE",
            [shift_id, user.company_id]
        );
        if (!department.rows.length || !shift.rows.length) throw Object.assign(new Error("invalid_start"), { status: 400 });
        const existing = await client.query(
            "SELECT id, freezed FROM saved_brief WHERE company_id = $1 AND department_id = $2 AND date = $3 AND is_department_journal FOR UPDATE",
            [user.company_id, department_id, date]
        );
        if (!managesBriefs(user) && (!user.permissions.update_brief || (user.department_id !== department_id
            && (!existing.rows.length || !(await client.query(`
                SELECT id FROM saved_report WHERE saved_brief_id = $1 AND company_id = $2
                    AND holder_id = $3 AND cancelled_at IS NULL LIMIT 1
            `, [existing.rows[0].id, user.company_id, user.id])).rows.length)))) {
            throw Object.assign(new Error("Forbidden"), { status: 403 });
        }
        if (!existing.rows.length) throw Object.assign(new Error("Not found"), { status: 404 });
        if (existing.rows[0].freezed) throw Object.assign(new Error("brief_read_only"), { status: 409 });
        const dutiesCount = await client.query("SELECT count(*) FROM brief_duty WHERE saved_brief_id = $1", [existing.rows[0].id]);
        if (Number(dutiesCount.rows[0].count) === 0) {
            await client.query(`
                UPDATE saved_brief SET lead_id = $1, original_lead_id = $1,
                    lead_name = $2, letter = $3, shift_id = $4, shift = $5,
                    started_at = clock_timestamp(), driving = false
                WHERE id = $6
            `, [user.id, user.name, user.lead_letter || '', shift.rows[0].id, shift.rows[0].name, existing.rows[0].id]);
        }
        await client.query(`
            INSERT INTO brief_duty (saved_brief_id, user_id, name, shift_id, shift)
            VALUES ($1, $2, $3, $4, $5) ON CONFLICT (saved_brief_id, user_id) DO UPDATE SET
                name = EXCLUDED.name, shift_id = EXCLUDED.shift_id, shift = EXCLUDED.shift,
                started_at = clock_timestamp(), ended_at = NULL, driving = false
            WHERE brief_duty.ended_at IS NOT NULL
        `, [existing.rows[0].id, user.id, user.name, shift.rows[0].id, shift.rows[0].name]);
        await client.query("COMMIT");
        return NextResponse.json({ ok: true, id: existing.rows[0].id });
    } catch (error: any) {
        await client.query("ROLLBACK");
        console.error(error);
        return NextResponse.json({ error: error.status ? error.message : "Database error" }, { status: error.status ?? 500 });
    } finally {
        client.release();
    }
}
