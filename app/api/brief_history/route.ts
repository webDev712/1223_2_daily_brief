import { NextResponse } from "next/server";
import sql from "@/lib/db"
import { auth } from "@/auth";

export async function GET(request: Request) {
    try{

        const session = await auth();

        if (!session?.user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const user_id = session.user.id;
        const company_id = session.user.company_id;
        const permissions = session.user.permissions;

        const { searchParams } = new URL(request.url);

        const date_from = searchParams.get("date_from");
        const date_to = searchParams.get("date_to");

        const rows = await sql`
            SELECT
                sb.id,
                sb.date::text AS date,
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
                sb.company_id,

                COALESCE(
                    (
                        SELECT json_agg(sr ORDER BY sr.id)
                        FROM saved_report sr
                        WHERE sr.saved_brief_id = sb.id
                            AND sr.company_id = ${company_id}
                    ),
                    '[]'::json
                ) AS reports,

                COALESCE(
                    (
                        SELECT json_agg(st ORDER BY st.id)
                        FROM saved_task st
                        WHERE st.saved_brief_id = sb.id
                            AND st.company_id = ${company_id}
                    ),
                    '[]'::json
                ) AS tasks

            FROM saved_brief sb
            WHERE sb.date >= ${date_from}
                AND sb.date <= ${date_to}
                AND sb.company_id = ${company_id}
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