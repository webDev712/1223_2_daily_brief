import { NextResponse } from "next/server";
import sql from "@/lib/db"
import { auth } from "@/auth";

export async function GET() {
    try{
        // const session = await auth();

        // if (!session?.user) {
        //     return NextResponse.json(
        //         { error: "Unauthorized" },
        //         { status: 401 }
        //     );
        // }
        const session = await auth();

        if (!session?.user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }
        // const user_id = session.user.id;
        // const company_id = session.user.company_id;
        // const permissions = session.user.permissions;
        const company_id = session.user.company_id;

        // await requireRole("lead");
        const rows = await sql`
            SELECT
                d.*,
                COALESCE(
                    JSON_AGG(
                        JSON_BUILD_OBJECT(
                            'id', u.id,
                            'name', u.name,
                            'email', u.email
                        )
                    ) FILTER (WHERE u.id IS NOT NULL),
                    '[]'::json
                ) AS users
            FROM department d
            LEFT JOIN website_user u
                ON d.id = u.department_id
                AND u.company_id = ${company_id}
            GROUP BY d.id;
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
            INSERT INTO department (name, is_main, company_id)
            VALUES (${name}, TRUE, ${company_id});
        `;

        return NextResponse.json({ success: true})
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
            is_main
        } = body;

        const rows = await sql`
            UPDATE department 
            SET name = ${name}, is_main = ${is_main}
            WHERE id = ${id} AND company_id = ${company_id};
        `;

        return NextResponse.json({ success: true})
    }
    catch (error) {
        console.log(error)
        return NextResponse.json(
            { error: "Database Error" },
            { status: 500 }
        )
    }
}
