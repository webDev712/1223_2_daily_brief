import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { saveReportSchedules, syncDepartmentReports, validateReportAssignment } from "@/lib/briefs";

export async function POST(request: Request) {
    const client = await pool.connect();
    try{
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        if (user.id !== user.main_admin_id && !user.permissions.edit_reports) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        const company_id = user.company_id;
        const body = await request.json();
        const {
            name,
            source,
            archived,
            assigned_to,
            metric,
            metric_range_from = 0,
            metric_range_to = 100,
            department_id,
            schedules,
        } = body;

        await client.query("BEGIN");
        await client.query("SELECT id FROM company WHERE id = $1 FOR UPDATE", [company_id]);
        await validateReportAssignment(client, company_id, body);
        const rows = await client.query(`
            INSERT INTO report (name, source, archived, assigned_to, company_id,
                metric, metric_range_from, metric_range_to, department_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id
        `, [name, source, archived, assigned_to, company_id, metric, metric_range_from, metric_range_to, department_id || null]);
        await saveReportSchedules(client, company_id, rows.rows[0].id, schedules);
        await syncDepartmentReports(client, company_id, rows.rows[0].id);
        await client.query("COMMIT");
        return NextResponse.json({ success: true, id: rows.rows[0].id });
    }
    catch (error: any) {
        await client.query("ROLLBACK");
        console.error(error);
        return NextResponse.json({ error: error.status ? error.message : "Database Error" }, { status: error.status ?? 500 });
    } finally {
        client.release();
    }
}

export async function PATCH(request: Request) {
    const client = await pool.connect();
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (user.id !== user.main_admin_id && !user.permissions.edit_reports) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        const company_id = user.company_id;

        const body = await request.json();
        const {
            id,
            name,
            source,
            archived,
            assigned_to,
            metric,
            metric_range_from,
            metric_range_to,
            department_id,
            schedules,
        } = body;

        await client.query("BEGIN");
        await client.query("SELECT id FROM company WHERE id = $1 FOR UPDATE", [company_id]);
        await validateReportAssignment(client, company_id, body);
        const rows = await client.query(`
            UPDATE report SET name = $1, source = $2, archived = $3, assigned_to = $4,
                metric = $5, metric_range_from = $6, metric_range_to = $7, department_id = $8
            WHERE id = $9 AND company_id = $10 RETURNING id
        `, [name, source, archived, assigned_to, metric, metric_range_from, metric_range_to, department_id || null, id, company_id]);
        if (!rows.rows.length) throw Object.assign(new Error("Not found"), { status: 404 });
        await saveReportSchedules(client, company_id, Number(id), schedules);
        await syncDepartmentReports(client, company_id, Number(id));
        await client.query("COMMIT");
        return NextResponse.json({ success: true });
    } catch (error: any) {
        await client.query("ROLLBACK");
        console.error(error);
        return NextResponse.json({ error: error.status ? error.message : "Database Error" }, { status: error.status ?? 500 });
    } finally {
        client.release();
    }
}