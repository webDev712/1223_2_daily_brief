import { NextResponse } from "next/server";
import sql from "@/lib/db"
import { requireRole } from "@/lib/auth";


export async function GET(request: Request) {
    try{
        await requireRole("lead");
        const { searchParams } = new URL(request.url);

        const id = searchParams.get("id");
        const rows = await sql`
            SELECT * FROM website_user WHERE id = ${id};
        `
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
        await requireRole("manager");
        const body = await request.json();

        const {
            email,
            name,
            user_role,
            lead_letter,
            archived=false
        } = body;

        const rows = await sql`
            INSERT INTO website_user (email, name, user_role, lead_letter, archived)
            VALUES (${email}, ${name}, ${user_role}, ${lead_letter}, ${archived});
        `
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Database error" },
            { status: 500 }
        );
    }
}



export async function PATCH(request: Request) {
    try{
        await requireRole("lead");
        const body = await request.json()

        const {
            id,
            email,
            name,
            user_role,
            lead_letter,
            archived
        } = body;

        await sql`
            UPDATE website_user
            SET email = ${email}, name = ${name}, user_role = ${user_role}, lead_letter = ${lead_letter}, archived = ${archived}
            WHERE id = ${id};
        `
        return NextResponse.json({
            success: true,
            id: id
        });
    } catch (error) {
        console.log(error);
        return NextResponse.json(
            { error: "Database error" },
            { status: 500 }
        )
    }
}