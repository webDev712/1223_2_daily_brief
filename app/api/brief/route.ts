import { NextResponse } from "next/server";
import sql from "@/lib/db"
import { auth } from "@/auth";


export async function GET(request: Request) {
    try{
        // await requireRole("lead");
        
        const { searchParams } = new URL(request.url);
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
        // await requireRole("lead");
        const body = await request.json();
        const { lead_id, lead_letter, lead_name, date } = body;
        
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


        const previous_brief_rows = await sql`
            SELECT *
            FROM saved_brief
            WHERE original_lead_id = ${lead_id}
                AND company_id = ${company_id}
            ORDER BY date DESC
            LIMIT 1;
        `

        const rows = await sql`
            INSERT INTO saved_brief (lead_id, letter, lead_name, freezed, original_lead_id, date, company_id)
            VALUES (${lead_id}, ${lead_letter}, ${lead_name}, false, ${lead_id}, ${date}, ${company_id})
            RETURNING id;
        `
        const new_id = rows[0].id;
        if (previous_brief_rows && previous_brief_rows[0] && previous_brief_rows[0]?.id){
            const previous_brief_id = previous_brief_rows[0].id;
            await sql`
                INSERT INTO saved_task (
                    text,
                    checked,
                    task_type,
                    saved_brief_id,
                    roll_to_next_brief,
                    company_id
                )
                SELECT
                    text,
                    checked,
                    task_type,
                    ${new_id},
                    roll_to_next_brief,
                    company_id
                FROM saved_task
                WHERE saved_brief_id = ${previous_brief_id}
                    AND checked != true
                    AND roll_to_next_brief = true
                    AND company_id = ${company_id};
            `
        }

        const reports_rows = await sql`
            WITH params AS (
                SELECT CAST(${lead_id} AS uuid) AS lead_uuid,
                    CAST(${lead_id} AS text) AS lead_text
            )
            SELECT r.*
            FROM report r
            JOIN website_user u
                ON u.id = (SELECT lead_uuid FROM params)
                AND u.company_id = ${company_id}
            WHERE (
                r.once_per = 'day'
                OR (
                    r.once_per = 'week'
                    AND EXTRACT(ISODOW FROM CURRENT_DATE) + 1 = r.start_at_day::integer
                )
                OR (
                    r.once_per = 'month'
                    AND EXTRACT(DAY FROM CURRENT_DATE) = r.start_at_day::integer
                )
            )
            AND r.archived = FALSE
            AND (
                (r.assigned_to->'all'->>'assigned')::boolean = TRUE
                OR (
                    (r.assigned_to->'person'->>'assigned')::boolean = TRUE
                    AND EXISTS (
                        SELECT 1
                        FROM jsonb_array_elements_text(r.assigned_to->'person'->'list') AS assigned_person_id
                        WHERE assigned_person_id = (SELECT lead_text FROM params)
                    )
                )
                OR (
                    (r.assigned_to->'department'->>'assigned')::boolean = TRUE
                    AND EXISTS (
                        SELECT 1
                        FROM jsonb_array_elements_text(r.assigned_to->'department'->'list') AS assigned_department_id
                        WHERE assigned_department_id = CAST(u.department_id AS text)
                    )
                )
            )
            AND u.company_id = ${company_id};
        `;
        await Promise.all(
            reports_rows.map((r) =>
                sql`
                INSERT INTO saved_report (text, name, source, checked, saved_brief_id, day_time, company_id)
                VALUES ('', ${r.name}, ${r.source}, FALSE, ${new_id}, ${r.day_time}, ${r.company_id});
                `
            )
            );
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Database error" },
            { status: 500 }
        );
    }
}
