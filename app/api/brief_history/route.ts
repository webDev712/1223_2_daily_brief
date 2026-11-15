import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ensureDepartmentBrief, getBriefs, managesBriefs } from "@/lib/briefs";
import sql, { pool } from "@/lib/db";
import { companyDate } from "@/lib/date";

export async function GET(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const { searchParams } = new URL(request.url);
        const filters = {
            from: searchParams.get("date_from"),
            to: searchParams.get("date_to"),
            department: searchParams.get("department_id")
        };
        let rows = await getBriefs(user, filters);
        const today = companyDate(user.timezone);
        if ((!filters.from || filters.from <= today) && (!filters.to || filters.to >= today)) {
            const departments = await sql(`
                SELECT id FROM department WHERE company_id = $1 AND is_main
                    AND ($2 OR id = $3) AND ($4::uuid IS NULL OR id = $4)
            `, [user.company_id, managesBriefs(user) || user.permissions.see_all_briefs === true
                || user.permissions.see_dashboard === true, user.department_id, filters.department]);
            const missing = departments.filter((d: any) => !rows.some((b: any) => b.department_id === d.id
                && b.date === today && b.is_department_journal));
            if (missing.length) {
                const client = await pool.connect();
                try {
                    await client.query("BEGIN");
                    for (const d of missing) await ensureDepartmentBrief(client, user.company_id, d.id, today);
                    await client.query("COMMIT");
                } catch (error) {
                    await client.query("ROLLBACK");
                    throw error;
                } finally {
                    client.release();
                }
                rows = await getBriefs(user, filters);
            }
        }
        return NextResponse.json(rows);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
}