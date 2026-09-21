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
            day_time
        } = body;

        const rows = await sql`
            INSERT INTO report (name, source, once_per, start_at_day, archived, assigned_to, day_time, company_id)
            VALUES (${name}, ${source}, ${once_per}, ${start_at_day}, ${archived}, ${assigned_to}, ${day_time}, ${company_id})
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
            day_time
        } = body;
        const rows = await sql`
            UPDATE report
            SET name = ${name}, source = ${source}, once_per = ${once_per}, start_at_day = ${start_at_day}, archived=${archived}, assigned_to = ${assigned_to}, day_time = ${day_time}
            WHERE id = ${id} AND company_id = ${company_id};
        `
        // const rows_2 = await sql`
        //     UPDATE saved_report
        //     SET name = ${name}, source = ${source}, once_per = ${once_per}, start_at_day = ${start_at_day}, archived=${archived}
        //     WHERE id = ${id};
        // `

        
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