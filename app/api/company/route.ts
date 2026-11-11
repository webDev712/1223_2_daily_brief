import { auth } from "@/auth";
import { extractGraphqlFromJwt } from "@/lib/smrtSync.mjs";
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
                c.timezone,
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
            smrt_api_key,
        } = body;
        const smrtApiKey = typeof smrt_api_key === "string" ? smrt_api_key.trim() : "";
        if (smrtApiKey && !extractGraphqlFromJwt(smrtApiKey)) {
            return NextResponse.json({ error: "Invalid SMRT API key" }, { status: 400 });
        }

        const rows = await sql`
            UPDATE company 
            SET name = ${name}, main_admin_id = ${main_admin_id}, logo = ${logo}, plan_id = ${plan_id}, stripe_customer_id = ${stripe_customer_id},
                smrt_api_key = COALESCE(${smrtApiKey || null}, smrt_api_key)
            WHERE id = ${company_id} AND main_admin_id = ${user_id}::uuid
            RETURNING id;
        `

        if (!rows.length) {
            return NextResponse.json({ error: "Only the company owner can change company settings" }, { status: 403 });
        }

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