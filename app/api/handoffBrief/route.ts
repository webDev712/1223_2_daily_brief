import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { auth } from "@/auth";

export async function PATCH(request: Request) {
    // CHANGING LEAD FOR DATE
    try {
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

        // await requireRole("lead");
        const body = await request.json();

        const {
            brief_id,
            lead_id,
            new_lead_id,
            reason,
            notes
        } = body;

        
        try {            
            await sql`
                UPDATE saved_brief
                SET lead_id = ${new_lead_id}
                WHERE id = ${brief_id}
                    AND company_id = ${company_id};
            `
            await sql`
                INSERT INTO handoff (from_name, to_name, reason, date, notes, company_id)
                VALUES ((SELECT w.name FROM website_user w WHERE w.id = ${lead_id}), 
                        (SELECT w.name FROM website_user w WHERE w.id = ${new_lead_id}), 
                        ${reason},
                        NOW(),
                        ${notes},
                        ${company_id});
            `



            return NextResponse.json({
                success: true,
                brief_id: brief_id
            });

        } catch (err) {
            throw err;
        }

    } catch (error) {
        console.error(error);

        return NextResponse.json(
            { error: "Database error" },
            { status: 500 }
        );
    }
}