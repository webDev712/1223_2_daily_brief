import { NextResponse } from "next/server";
import sql from "@/lib/db"
import { requireRole } from "@/lib/auth";
import { SelectedPermission } from "@/lib/types";


// export async function GET(request: Request) {
//     try{
//         // await requireRole("lead");
//         const { searchParams } = new URL(request.url);

//         const id = searchParams.get("id");
//         const rows = await sql`
//             SELECT * FROM website_user WHERE id = ${id};
//         `
//         return NextResponse.json(rows);
//     } catch (error) {
//         console.log(error);
//         return NextResponse.json(
//             { error: "Database error" },
//             { status: 500 }
//         )
//     }
// }

export async function POST(request: Request) {
    try {
        // await requireRole("manager");

        const body = await request.json();

        const {
            name,
            permissions,
        } = body;
        const permissionsObject = Object.fromEntries(
            permissions.map((permission: SelectedPermission) => [
                permission.js_name,
                permission.selected
            ])
        );
        const rows = await sql`
            INSERT INTO role (
                name,
                permissions
            )
            VALUES (
                ${name},
                ${JSON.stringify(permissionsObject)}::jsonb
            )
            RETURNING id;
        `;

        return NextResponse.json({
            success: true,
            id: rows[0].id
        });

    } catch (error) {
        console.error(error);

        return NextResponse.json(
            { error: "Database error" },
            { status: 500 }
        );
    }
}



export async function DELETE (request: Request) {
    try{
        // await requireRole("lead");
        const body = await request.json()

        const {
            id: id
        } = body;

        const users_rows = await sql`
            SELECT *
            FROM website_user
            WHERE role_id = ${id};
        `

        if (users_rows.length > 0) {
            return NextResponse.json({
                success: false,
                id: id,
                message: 'there_are_users'
            },
            { status: 409 });
        }
        await sql`
            DELETE FROM role
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