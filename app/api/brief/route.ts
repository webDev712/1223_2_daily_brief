import { NextResponse } from "next/server";
import sql from "@/lib/db"
import { requireRole } from "@/lib/auth";


export async function GET(request: Request) {
    try{
        await requireRole("lead");

        const { searchParams } = new URL(request.url);

        const id = searchParams.get("id");

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
            WHERE sb.id = ${id}
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

export async function POST(request: Request) {
    try {
        await requireRole("lead");
        const body = await request.json();
        const { lead_id, lead_letter, lead_name } = body;
        const rows = await sql`
            INSERT INTO saved_brief (lead_id, letter, lead_name, freezed, original_lead_id, date)
            VALUES (${lead_id}, ${lead_letter}, ${lead_name}, false, ${lead_id}, NOW())
            RETURNING id;
        `
        const new_id = rows[0].id;
        const reports_rows = await sql`
            SELECT *
            FROM report r
            WHERE (
                r.once_per = 'day'
                OR (r.once_per = 'week'
                    AND EXTRACT(ISODOW FROM CURRENT_DATE) = r.start_at_day::integer)
                OR (r.once_per = 'month'
                    AND EXTRACT(DAY FROM CURRENT_DATE) = r.start_at_day::integer)
            )
            AND r.archived <> TRUE;`;
        await Promise.all(
            reports_rows.map((r) =>
                sql`
                INSERT INTO saved_report (text, name, source, checked, saved_brief_id)
                VALUES ('', ${r.name}, ${r.source}, FALSE, ${new_id});
                `
            )
            );
        console.log(reports_rows)
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Database error" },
            { status: 500 }
        );
    }
}

export async function PATCH(request: Request) {
    try{
        await requireRole("manager");
        const body = await request.json();
        const { brief_id, new_status } = body;
        const rows = await sql`
            UPDATE brief
            SET archived = ${new_status}
            WHERE id = ${brief_id};
        `
        return NextResponse.json({ success: true })
    }
    catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Database error" },
            { status: 500 }
        );
    }
}