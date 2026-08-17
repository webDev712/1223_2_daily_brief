import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { requireRole } from "@/lib/auth";


export async function POST(request: Request) {
    try{
        // await requireRole("manager");
        const body = await request.json();
        const {
            name,
        } = body;

        const rows = await sql`
            INSERT INTO shift (name, archived)
            VALUES (${name}, false);
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
        // await requireRole("manager");
        const body = await request.json();
        const {
            id,
            name,
            archived
        } = body;

        const rows = await sql`
            UPDATE shift
            SET name = ${name}, archived = ${archived}
            WHERE id = ${id};
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