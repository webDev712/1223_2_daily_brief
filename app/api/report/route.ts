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
            source,
            once_per,
            start_at_day="",
            archived,
            assigned_to,
            day_time,
            metric,
            metric_range_from,
            metric_range_to,
            department_id,
            default_holder_id=null,
            backup_holder_id=null,
            backup_start_at_day="",
        } = body;
        const normalizedDefaultHolderId =
            default_holder_id === "" ? null : default_holder_id;

        const normalizedBackupHolderId =
            backup_holder_id === "" ? null : backup_holder_id;

        console.log('body')
        console.log(body)
        console.log('body')

        const rows = await sql`
            UPDATE report
            SET name = ${name}, source = ${source}, once_per = ${once_per}, start_at_day = ${start_at_day}, archived=${archived}, assigned_to = ${assigned_to}, day_time = ${day_time}, default_holder_id = ${normalizedDefaultHolderId}, metric = ${metric}, metric_range_from = ${metric_range_from}, metric_range_to = ${metric_range_to}, department_id = ${department_id}, backup_holder_id = ${normalizedBackupHolderId}, backup_start_at_day = ${backup_start_at_day}
            WHERE id = ${id} AND company_id = ${company_id};
        `
        
        return NextResponse.json({ success: true })
    }
    catch (error) {
        console.log(error)
        return NextResponse.json(
            { error: "Database Error" },
            { status: 500 }
        )
    }
}