import { NextResponse } from "next/server";
import sql from "@/lib/db"
import { requireRole } from "@/lib/auth";

export async function GET(request: Request) {
    try{
        await requireRole("lead");

        const { searchParams } = new URL(request.url);

        const date_from = searchParams.get("date_from");
        const date_to = searchParams.get("date_to");

        const rows = await sql`
            SELECT
                sb.id,
                sb.date,
                sb.updated_at,
                sb.driving,
                sb.shift,
                sb.lead_name,
                sb.letter,
                sb.reports_reviewed,
                sb.reports_all_count,
                sb.notes,
                sb.lead_id,
                sb.original_lead_id,
                sb.freezed,
                sb.findings,
                sb.covered,

                COALESCE(
                    (
                        SELECT json_agg(sp ORDER BY sp.id)
                        FROM saved_project sp
                        WHERE sp.saved_brief_id = sb.id
                    ),
                    '[]'::json
                ) AS projects,

                COALESCE(
                    (
                        SELECT json_agg(sr ORDER BY sr.id)
                        FROM saved_report sr
                        WHERE sr.saved_brief_id = sb.id
                    ),
                    '[]'::json
                ) AS reports,

                COALESCE(
                    (
                        SELECT json_agg(st ORDER BY st.id)
                        FROM saved_task st
                        WHERE st.saved_brief_id = sb.id
                    ),
                    '[]'::json
                ) AS tasks

            FROM saved_brief sb
            WHERE sb.date >= ${date_from}
            AND sb.date <= ${date_to}
            ORDER BY sb.date DESC, sb.lead_name;
        `;
        return NextResponse.json(rows);
    } catch (error) {
        console.log(error);
        return NextResponse.json(
            { error: "Database error" },
            { status: 500 }
        )
    }
}