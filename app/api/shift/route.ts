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
        } = body;

        const rows = await sql`
            INSERT INTO shift (name, archived, company_id)
            VALUES (${name}, false, ${company_id});
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
            archived
        } = body;

        const rows = await sql`
            UPDATE shift
            SET name = ${name}, archived = ${archived}
            WHERE id = ${id}
                AND company_id = ${company_id};
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