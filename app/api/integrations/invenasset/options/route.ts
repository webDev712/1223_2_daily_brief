import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { managesBriefs } from "@/lib/briefs";
import { invenassetCompanyConnection, requestInvenasset } from "@/lib/invenasset";

export async function GET() {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({error: "Unauthorized"}, {status: 401});
    if (!managesBriefs(user) && !user.permissions.update_brief) return NextResponse.json({error: "Forbidden"}, {status: 403});
    try {
        const connection = await invenassetCompanyConnection(user.company_id);
        const {response, data} = await requestInvenasset({action: "issue.options"}, connection.token);
        if (!response.ok) throw Object.assign(new Error("invenasset_unavailable"), {status: response.status === 401 || response.status === 403 ? 409 : 503});
        if (data.company_id !== connection.companyId) throw new Error("Company mismatch");
        return NextResponse.json(data, {headers: {"Cache-Control": "no-store"}});
    } catch (error: any) {
        return NextResponse.json({error: error.status === 409 ? "invenasset_not_connected" : "invenasset_unavailable"}, {status: error.status ?? 503});
    }
}
