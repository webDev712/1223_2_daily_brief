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
        const company_id = session.user.company_id;
        const { searchParams } = new URL(request.url);
        const date = searchParams.get("date");

        const rows = date ? await sql`
            WITH saved AS (
                SELECT department_id FROM saved_brief
                WHERE company_id = ${company_id} AND date = ${date}::date AND is_department_journal
            )
            SELECT
                d.*,
                COALESCE(
                    JSON_AGG(
                        JSON_BUILD_OBJECT(
                            'id', u.id,
                            'name', u.name,
                            'email', u.email
                        )
                    ) FILTER (WHERE u.id IS NOT NULL),
                    '[]'::json
                ) AS users
            FROM department d
            LEFT JOIN website_user u
                ON d.id = u.department_id
                AND u.company_id = ${company_id}
            WHERE d.company_id = ${company_id}
              AND (
                d.id IN (SELECT department_id FROM saved)
                OR EXISTS (
                    SELECT 1 FROM report r
                    JOIN report_schedule s ON s.report_id = r.id AND s.company_id = r.company_id
                    WHERE r.company_id = ${company_id} AND r.archived IS NOT TRUE
                      AND (r.assigned_to->'all'->>'assigned' = 'true'
                           OR (r.assigned_to->'department'->>'assigned' = 'true'
                               AND r.assigned_to->'department'->'list' @> jsonb_build_array(d.id::text)))
                      AND (s.once_per = 'day'
                           OR (s.once_per = 'month' AND s.month_day = EXTRACT(DAY FROM ${date}::date)::int)
                           OR (s.once_per = 'week' AND (s.weekday_mask & (1 << EXTRACT(DOW FROM ${date}::date)::int)) <> 0))
                )
                OR EXISTS (
                    SELECT 1 FROM saved_task t
                    JOIN saved_brief b ON b.id = t.saved_brief_id AND b.company_id = t.company_id
                    WHERE b.company_id = ${company_id} AND b.department_id = d.id AND b.date = (
                        SELECT max(date) FROM saved_brief WHERE company_id = ${company_id} AND department_id = d.id AND date < ${date}::date
                    ) AND t.checked IS NOT TRUE AND t.roll_to_next_brief = true
                )
              )
            GROUP BY d.id
        ` : await sql`
            SELECT
                d.*,
                COALESCE(
                    JSON_AGG(
                        JSON_BUILD_OBJECT(
                            'id', u.id,
                            'name', u.name,
                            'email', u.email
                        )
                    ) FILTER (WHERE u.id IS NOT NULL),
                    '[]'::json
                ) AS users
            FROM department d
            LEFT JOIN website_user u
                ON d.id = u.department_id
                AND u.company_id = ${company_id}
            WHERE d.company_id = ${company_id}
            GROUP BY d.id;
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

        // await requireRole("manager");
        const body = await request.json();
        const {
            name,
        } = body;

        const rows = await sql`
            INSERT INTO department (name, is_main, company_id)
            VALUES (${name}, TRUE, ${company_id});
        `;

        return NextResponse.json({ success: true})
    }
    catch (error) {
        console.log(error)
        return NextResponse.json(
            { error: "Database Error" },
            { status: 500 }
        )
    }
}



export async function PATCH(request: Request) {
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

        // await requireRole("manager");
        const body = await request.json();
        const {
            id,
            name,
            is_main
        } = body;

        const rows = await sql`
            UPDATE department 
            SET name = ${name}, is_main = ${is_main}
            WHERE id = ${id} AND company_id = ${company_id};
        `;

        return NextResponse.json({ success: true})
    }
    catch (error) {
        console.log(error)
        return NextResponse.json(
            { error: "Database Error" },
            { status: 500 }
        )
    }
}
