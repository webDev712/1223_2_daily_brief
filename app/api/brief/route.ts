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
        const { lead_id, lead_letter, lead_name, date, created_at } = body;
        
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
            INSERT INTO saved_brief (lead_id, letter, lead_name, freezed, original_lead_id, date, company_id, created_at)
            VALUES (${lead_id}, ${lead_letter}, ${lead_name}, false, ${lead_id}, ${date}, ${company_id}, ${created_at})
            RETURNING id;
        `

        // DONE 
        // DONE 
        // DONE 
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
    SELECT r.*
    FROM report r
    JOIN website_user u
        ON u.id = ${lead_id}::uuid
        AND u.company_id = ${company_id}
    WHERE r.company_id = ${company_id}
      AND r.archived = FALSE

      -- Report is scheduled for this date
      AND (
          r.once_per = 'day'

          OR (
              r.once_per = 'week'
              AND (
                  r.start_at_day
                  & (
                      1 << (
                          EXTRACT(ISODOW FROM ${date}::date)::integer - 1
                      )
                  )
              ) <> 0
          )

          OR (
              r.once_per = 'month'
              AND EXTRACT(DAY FROM ${date}::date) = r.start_at_day::integer
          )
      )

      -- Report is assigned to this department / all
      AND (
          r.assigned_to->'all'->>'assigned' = 'true'

          OR (
              r.assigned_to->'department'->>'assigned' = 'true'
              AND r.assigned_to->'department'->'list'
                  @> jsonb_build_array(u.department_id::text)
          )
      );
`;
        console.log('REPORTS TO CREATE:', reports_rows);
        await Promise.all(
            reports_rows.map((r) =>
                sql`
                INSERT INTO saved_report (text, name, source, checked, day_time, company_id, metric, metric_range_from, metric_range_to, department_id, holder_id, date, report_id)
                VALUES ('', ${r.name}, ${r.source}, FALSE, ${r.day_time}, ${r.company_id}, ${r.metric}, ${r.metric_range_from}, ${r.metric_range_to}, ${r.department_id}, ${r.holder_id ?? r.default_holder_id}, ${date}, ${r.id} )
                ON CONFLICT (report_id, date)
                DO NOTHING;
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
