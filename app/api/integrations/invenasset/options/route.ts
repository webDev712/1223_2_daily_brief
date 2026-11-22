import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { managesBriefs } from "@/lib/briefs";
import sql from "@/lib/db";
import { invenassetCompanyConnection, requestInvenasset } from "@/lib/invenasset";

export async function GET(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({error: "Unauthorized"}, {status: 401});
    if (!managesBriefs(user) && !user.permissions.update_brief && !user.permissions.edit_action_tracker) return NextResponse.json({error: "Forbidden"}, {status: 403});
    const target = request.nextUrl.searchParams.get("target") === "supply" ? "supply" : "issue";
    try {
        const connection = await invenassetCompanyConnection(user.company_id);
        const {response, data} = await requestInvenasset({action: target === "supply" ? "supply.options" : "issue.options"}, connection.token);
        if (!response.ok) throw Object.assign(new Error("invenasset_unavailable"), {status: response.status === 401 || response.status === 403 ? 409 : 503});
        if (data.company_id !== connection.companyId) throw new Error("Company mismatch");
        if (target === "supply") {
            return NextResponse.json(data, {headers: {"Cache-Control": "no-store"}});
        }
        const localUsers = await sql`
            SELECT id, name, LOWER(TRIM(email)) AS email
            FROM website_user
            WHERE company_id = ${user.company_id}
                AND archived IS NOT TRUE
                AND email IS NOT NULL
                AND TRIM(email) <> ''
        `;
        const usersByEmail = new Map<string, {id: string; name: string}>();
        for (const u of localUsers) {
            if (u.email && !usersByEmail.has(u.email)) {
                usersByEmail.set(u.email, {id: u.id, name: u.name});
            }
        }
        const assignees = Array.isArray(data.assignees)
            ? data.assignees.map((a: {id: number; name: string; email?: string}) => {
                const email = typeof a.email === "string" ? a.email.trim().toLowerCase() : "";
                const matchedUser = email ? usersByEmail.get(email) : undefined;
                return {
                    id: a.id,
                    name: matchedUser ? matchedUser.name : a.name,
                    daily_brief_user_id: matchedUser ? matchedUser.id : null,
                    matched: !!matchedUser,
                };
            }).sort((a: {matched: boolean; name: string}, b: {matched: boolean; name: string}) => {
                if (a.matched !== b.matched) return a.matched ? -1 : 1;
                return a.name.localeCompare(b.name);
            })
            : [];
        return NextResponse.json({...data, assignees}, {headers: {"Cache-Control": "no-store"}});
    } catch (error: any) {
        return NextResponse.json({error: error.status === 409 ? "invenasset_not_connected" : "invenasset_unavailable"}, {status: error.status ?? 503});
    }
}
