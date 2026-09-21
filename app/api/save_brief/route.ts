import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { auth } from "@/auth";

export async function POST(request: Request) {
    try {
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

        // await requireRole("lead");
        const body = await request.json();

        const {
            lead_id,
            driving_today,
            shift,
            lead_name,
            lead_letter,
            reports_reviewed_count,
            notes,
            reports = [],
            tasks = [],
        } = body;
        
        
        await sql`BEGIN`;

        try {
            // saved_brief
            const rows = await sql`
                INSERT INTO saved_brief (
                    lead_id,
                    driving,
                    shift,
                    lead_name,
                    letter,
                    reports_reviewed,
                    reports_all_count,
                    notes,
                    date,
                    company_id
                )
                VALUES (
                    ${lead_id},
                    ${driving_today},
                    ${shift},
                    ${lead_name},
                    ${lead_letter},
                    ${reports_reviewed_count},
                    ${reports.length},
                    ${notes},
                    NOW(),
                    ${company_id}
                )
                RETURNING id;
            `;

            const new_id = rows[0].id;

            // reports
            if (reports.length > 0) {
                for (const r of reports) {
                    await sql`
                        INSERT INTO saved_report (
                            text,
                            name,
                            source,
                            checked,
                            saved_brief_id,
                            day_time,
                            company_id
                        )
                        VALUES (
                            ${r.text},
                            ${r.name},
                            ${r.source},
                            ${r.checked},
                            ${new_id},
                            ${r.day_time},
                            ${company_id}
                        )
                    `;
                }
            }

            // tasks
            if (tasks.length > 0) {
                for (const t of tasks) {
                    await sql`
                        INSERT INTO saved_task (
                            text,
                            checked,
                            task_type,
                            saved_brief_id,
                            company_id
                        )
                        VALUES (
                            ${t.text},
                            ${t.checked},
                            ${t.task_type},
                            ${new_id},
                            ${company_id}
                        )
                    `;
                }
            }

            await sql`COMMIT`;

            return NextResponse.json({
                success: true,
                id: new_id
            });

        } catch (err) {
            await sql`ROLLBACK`;
            throw err;
        }

    } catch (error) {
        console.error(error);

        return NextResponse.json(
            { error: "Database error" },
            { status: 500 }
        );
    }
}