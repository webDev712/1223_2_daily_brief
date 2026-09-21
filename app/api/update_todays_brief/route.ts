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
            id,
            lead_id,
            driving,
            shift,
            lead_name,
            letter,
            reports_reviewed_count,
            notes,
            reports = [],
            tasks = [],
            findings = [],
            covered = [],
            freezed
        } = body;
        
        
        // await sql`BEGIN`;

        try {
            // saved_brief
            const rows = await sql`
                UPDATE saved_brief
                SET
                    lead_id = ${lead_id},
                    driving = ${driving},
                    shift = ${shift},
                    lead_name = ${lead_name},
                    letter = ${letter},
                    reports_reviewed = ${reports_reviewed_count},
                    reports_all_count = ${reports.length},
                    notes = ${notes},
                    findings = ${JSON.stringify(findings)},
                    updated_at = NOW(),
                    freezed = ${freezed},
                    covered = ${JSON.stringify(covered)}
                WHERE
                    id = ${id}
                    AND company_id = ${company_id};`;


            // reports
            await Promise.all(
                reports.map(async (r: any) => {
                    if (r.id == null) {
                        await sql`
                            INSERT INTO saved_report (
                                text,
                                name,
                                source,
                                checked,
                                timestamp,
                                saved_brief_id,
                                day_time,
                                company_id
                            )
                            VALUES (
                                ${r.text},
                                ${r.name},
                                ${r.source},
                                ${r.checked},
                                ${r.timestamp},
                                ${id},
                                ${r.dat_time},
                                ${company_id}
                            );
                        `;
                    } else {
                        await sql`
                            UPDATE saved_report
                            SET
                                text = ${r.text},
                                name = ${r.name},
                                source = ${r.source},
                                checked = ${r.checked},
                                timestamp = ${r.timestamp},
                                day_time = ${r.day_time}
                            WHERE id = ${r.id}
                                AND company_id = ${company_id};
                        `;
                    }
                })
                );

            // tasks
            await Promise.all(
                tasks.map(async (t: any) => {
                    if (t.id == null || t.custom_id !== null) {
                        if (t.custom_id !== undefined){
                            await sql`
                                INSERT INTO saved_task (
                                    id,
                                    text,
                                    checked,
                                    task_type,
                                    saved_brief_id,
                                    roll_to_next_brief,
                                    company_id
                                )
                                VALUES (
                                    ${t.custom_id},
                                    ${t.text},
                                    ${t.checked ?? false},
                                    ${t.task_type},
                                    ${id},
                                    ${t.roll_to_next_brief ?? false},
                                    ${company_id}
                                )
                                ON CONFLICT (id)
                                DO UPDATE SET
                                    text = EXCLUDED.text,
                                    checked = EXCLUDED.checked,
                                    task_type = EXCLUDED.task_type,
                                    roll_to_next_brief = EXCLUDED.roll_to_next_brief;
                            `;
                        }
                        else {
                            await sql`
                                UPDATE saved_task
                                SET
                                    text = ${t.text},
                                    checked = ${t.checked},
                                    task_type = ${t.task_type},
                                    roll_to_next_brief = ${t.roll_to_next_brief}
                                WHERE id = ${t.id}
                                    AND company_id = ${company_id};
                            `;
                        }
                    } else {
                        await sql`
                            UPDATE saved_task
                            SET
                                text = ${t.text},
                                checked = ${t.checked},
                                task_type = ${t.task_type},
                                roll_to_next_brief = ${t.roll_to_next_brief}
                            WHERE id = ${t.id}
                                AND company_id = ${company_id};
                        `;
                    }
                })
            );

            return NextResponse.json({ success: true, });
        } catch (err) {
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