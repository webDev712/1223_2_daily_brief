import { NextResponse } from "next/server";
import sql from "@/lib/db"
import { requireRole } from "@/lib/auth";

export async function GET(request: Request) {
    try{
        await requireRole("lead");
        
        const { searchParams } = new URL(request.url);

        const user_id = searchParams.get("user_id");

        const rows = await sql`
            SELECT
                b.id AS b_id,
                w.name AS lead_name,
                b.*,
                w.lead_letter,
                (
                    SELECT json_agg(p)
                    FROM project p
                    WHERE p.done=false
                ) AS projects,
                (
                SELECT json_agg(r)
                    FROM report r
                    WHERE r.once_per = 'day'
                    OR (r.once_per = 'week' AND EXTRACT(ISODOW FROM CURRENT_DATE) = r.start_at_day::integer)
                    OR (r.once_per = 'month' AND EXTRACT(DAY FROM CURRENT_DATE) = r.start_at_day::integer)
                ) AS reports
            FROM brief b, website_user w
            WHERE w.user_role = 'lead'
            AND w.id = b.lead_id
            AND w.archived=false
            AND w.id = ${user_id};
        `
        return NextResponse.json(rows);
    } catch (error) {
        console.log(error);
        return NextResponse.json(
            { error: "Database error" },
            { status: 500 }
        )
    }
}