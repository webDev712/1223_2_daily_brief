import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { requireRole } from "@/lib/auth";


export async function POST(request: Request) {
    try{
        await requireRole("manager");
        const body = await request.json();
        const {
            name,
            source,
            once_per,
            start_at_day=1,
            archived
        } = body;

        const rows = await sql`
            INSERT INTO report (name, source, once_per, start_at_day, archived)
            VALUES (${name}, ${source}, ${once_per}, ${start_at_day}, ${archived});
        `;

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

export async function PATCH(request: Request) {
    try{
        await requireRole("manager");
        const body = await request.json();
        const {
            id,
            name,
            source,
            once_per,
            start_at_day="",
            archived
        } = body;
        console.log(body)
        const rows = await sql`
            UPDATE report
            SET name = ${name}, source = ${source}, once_per = ${once_per}, start_at_day = ${start_at_day}, archived=${archived}
            WHERE id = ${id};
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