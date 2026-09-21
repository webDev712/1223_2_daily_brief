import { auth } from "@/auth";
import sql from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET () {
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
        
        const rows = await sql`
            SELECT 
                c.id,
                c.name,
                c.main_admin_id,
                c.logo,
                c.plan_id,
                c.stripe_customer_id,
                c.created_at,
                c.colors,
                u.name AS admin_name,
                p.name AS plan_name
            FROM company c, website_user u, plan p
            WHERE c.id = ${company_id}
                AND c.main_admin_id = u.id
                AND p.id = c.plan_id;
        `

        return NextResponse.json(rows);
    }
    catch (error) {
        console.log(error);
        return NextResponse.json(
            { error: "Database error" },
            { status: 500 }
        )
    }
}


export async function PATCH (request: NextRequest) {
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
        
        const body = await request.json();
        const {
            name,
            main_admin_id,
            logo,
            plan_id,
            stripe_customer_id,
        } = body;

        const rows = await sql`
            UPDATE company 
            SET name = ${name}, main_admin_id = ${main_admin_id}, logo = ${logo}, plan_id = ${plan_id}, stripe_customer_id = ${stripe_customer_id}
            WHERE id = ${company_id};
        `

        return NextResponse.json(rows);
    }
    catch (error) {
        console.log(error);
        return NextResponse.json(
            { error: "Database error" },
            { status: 500 }
        )
    }
}