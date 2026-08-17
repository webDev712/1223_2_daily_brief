import { NextResponse } from "next/server";
import sql from "@/lib/db"
import { requireRole } from "@/lib/auth";

export async function POST(request: Request) {
    try {
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
            projects = [],
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
                    id = ${id};`;


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
                                saved_brief_id
                            )
                            VALUES (
                                ${r.text},
                                ${r.name},
                                ${r.source},
                                ${r.checked},
                                ${r.timestamp},
                                ${id}
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
                                timestamp = ${r.timestamp}
                            WHERE id = ${r.id};
                        `;
}
                })
                );

            // tasks
            console.log('tasks')
            console.log(tasks)
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
                                    saved_brief_id
                                )
                                VALUES (
                                    ${t.custom_id},
                                    ${t.text},
                                    ${t.checked ?? false},
                                    ${t.task_type},
                                    ${id}
                                );
                            `;
                        }
                        else {
                            await sql`
                                UPDATE saved_task
                                SET
                                    text = ${t.text},
                                    checked = ${t.checked},
                                    task_type = ${t.task_type}
                                WHERE id = ${t.id};
                            `;
                        }
                    } else {
                        await sql`
                            UPDATE saved_task
                            SET
                                text = ${t.text},
                                checked = ${t.checked},
                                task_type = ${t.task_type}
                            WHERE id = ${t.id};
                        `;
                    }
                })
            );

            // projects
            await Promise.all(
                projects.map((p: any) => 
                    sql`
                        UPDATE saved_project
                        SET 
                            name = ${p.name},
                            text = ${p.text},
                            checked = ${p.checked}
                        WHERE
                            id = ${p.id}`
                )
            )
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