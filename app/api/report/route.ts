import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { auth } from "@/auth";

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
            source,
            once_per,
            start_at_day=1,
            archived,
            assigned_to,
            day_time,
            default_holder,
            metric,
            metric_range_from = 0,
            metric_range_to = 100,
            department_id,
            backup_start_at_day=1,
            backup_holder_id,
        } = body;
        console.log('body')
        console.log(body)
        const normalizedDefaultHolderId =
            default_holder === "" ? null : default_holder;

        const normalizedBackupHolderId =
            backup_holder_id === "" ? null : backup_holder_id;

        const rows = await sql`
            INSERT INTO report (name, source, once_per, start_at_day, archived, assigned_to, day_time, company_id, default_holder_id, metric, metric_range_from, metric_range_to, department_id, backup_start_at_day, backup_holder_id)
            VALUES (${name}, ${source}, ${once_per}, ${start_at_day}, ${archived}, ${assigned_to}, ${day_time}, ${company_id}, ${normalizedDefaultHolderId}, ${metric}, ${metric_range_from}, ${metric_range_to}, ${department_id}, ${backup_start_at_day}, ${normalizedBackupHolderId})
            RETURNING id;
        `;

        return NextResponse.json({ success: true, id:  rows[0].id})
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
    try {
        const session = await auth();

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const company_id = session.user.company_id;

        const body = await request.json();
        const {
            id,
            name,
            source,
            once_per,
            start_at_day,
            archived,
            assigned_to,
            day_time,
            metric,
            metric_range_from,
            metric_range_to,
            department_id,
            default_holder_id,
            backup_holder_id,
            backup_start_at_day,
            check_before = "",
        } = body;

        const nullIfEmpty = (v: unknown) => (v === "" || v === undefined ? null : v);

        const normalizedDefaultHolderId = nullIfEmpty(default_holder_id);
        const normalizedBackupHolderId = nullIfEmpty(backup_holder_id);
        const normalizedStartAtDay = nullIfEmpty(start_at_day);
        const normalizedBackupStartAtDay = nullIfEmpty(backup_start_at_day);

        await sql.transaction([
        sql`
            UPDATE report
            SET name = ${name}, source = ${source}, once_per = ${once_per},
                start_at_day = ${normalizedStartAtDay}, archived = ${archived},
                assigned_to = ${assigned_to}, day_time = ${day_time},
                default_holder_id = ${normalizedDefaultHolderId},
                metric = ${metric}, metric_range_from = ${metric_range_from},
                metric_range_to = ${metric_range_to}, department_id = ${department_id},
                backup_holder_id = ${normalizedBackupHolderId},
                backup_start_at_day = ${normalizedBackupStartAtDay},
                check_before = ${check_before}
            WHERE id = ${id} AND company_id = ${company_id};
        `,

        sql`
            WITH p AS (
                SELECT (now() AT TIME ZONE 'Europe/Warsaw')::date AS d
            ),
            c AS (
                SELECT
                    r.*,
                    p.d AS today,
                    (r.once_per = 'week'
                        AND (COALESCE(r.start_at_day, 0) & (1 << EXTRACT(DOW FROM p.d)::int)) <> 0) AS is_default_day,
                    (r.once_per = 'week'
                        AND r.backup_holder_id IS NOT NULL
                        AND (COALESCE(r.backup_start_at_day, 0) & (1 << EXTRACT(DOW FROM p.d)::int)) <> 0) AS is_backup_day,
                    (r.once_per = 'month'
                        AND r.start_at_day::integer = EXTRACT(DAY FROM p.d)::integer) AS is_month_day
                FROM report r
                CROSS JOIN p
                WHERE r.id = ${id}
                    AND r.company_id = ${company_id}
                    AND r.archived = FALSE
                    AND EXISTS (
                        SELECT 1
                        FROM saved_brief b
                        JOIN website_user u
                            ON u.id = b.original_lead_id::uuid
                            AND u.company_id = r.company_id
                        WHERE b.company_id = r.company_id
                            AND b.date::date = p.d
                            AND (
                                r.assigned_to->'all'->>'assigned' = 'true'
                                OR (
                                    r.assigned_to->'department'->>'assigned' = 'true'
                                    AND r.assigned_to->'department'->'list'
                                        @> jsonb_build_array(u.department_id::text)
                                )
                            )
                    )
            ),
            should AS (
                SELECT * FROM c
                WHERE once_per = 'day'
                    OR is_default_day
                    OR is_backup_day
                    OR is_month_day
            ),
            upserted AS (
                INSERT INTO saved_report (
                    text, name, source, checked, day_time, company_id, metric,
                    metric_range_from, metric_range_to, department_id,
                    holder_id, date, report_id, check_before
                )
                SELECT
                    '', s.name, s.source, FALSE, s.day_time, s.company_id, s.metric,
                    s.metric_range_from, s.metric_range_to, s.department_id,
                    CASE
                        WHEN s.is_default_day THEN s.default_holder_id
                        WHEN s.is_backup_day  THEN s.backup_holder_id
                        ELSE s.default_holder_id
                    END,
                    s.today, s.id, s.check_before
                FROM should s
                ON CONFLICT (report_id, date)
                DO UPDATE SET
                    name = EXCLUDED.name,
                    source = EXCLUDED.source,
                    day_time = EXCLUDED.day_time,
                    metric = EXCLUDED.metric,
                    metric_range_from = EXCLUDED.metric_range_from,
                    metric_range_to = EXCLUDED.metric_range_to,
                    department_id = EXCLUDED.department_id,
                    holder_id = EXCLUDED.holder_id,
                    check_before = EXCLUDED.check_before
                RETURNING id
            )
            DELETE FROM saved_report
            WHERE report_id = ${id}
                AND company_id = ${company_id}
                AND date::date = (SELECT d FROM p)
                AND checked = FALSE
                AND NOT EXISTS (SELECT 1 FROM should);
        `,
        ]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: "Database Error" }, { status: 500 });
    }
}