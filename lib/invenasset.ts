import { getCurrentUser } from "@/lib/auth";
import sql from "@/lib/db";

export function invenassetConfig() {
    return { issuer: "https://invenasset.com" };
}

export function invenassetRequestConfig(request: Request) {
    const url = new URL(request.url);
    return { ...invenassetConfig(), origin: url.origin,
        redirectUri: new URL("/api/integrations/invenasset/callback", url.origin).toString() };
}

export async function invenassetCompanyConnection(companyId: string) {
    const rows = await sql`SELECT invenasset_company_id, token_encrypted, issuer, expires_at FROM invenasset_connection WHERE company_id=${companyId}`;
    const saved = rows[0];
    if (!saved || saved.issuer !== invenassetConfig().issuer || new Date(saved.expires_at).getTime() <= Date.now()) {
        throw Object.assign(new Error("invenasset_not_connected"), {status: 409});
    }
    return { companyId: saved.invenasset_company_id, token: saved.token_encrypted };
}

export async function invenassetOwner() {
    const user = await getCurrentUser();
    if (!user) return null;
    const isManager = user.id === user.main_admin_id
        || user.role?.toLowerCase() === "manager"
        || user.permissions?.edit_app_settings === true
        || user.permissions?.reasign_reports === true
        || (user.permissions?.see_all_briefs === true && user.permissions?.update_brief === true);
    return isManager ? user : null;
}

export async function requestInvenasset(body: Record<string, unknown>, token?: string) {
    const config = invenassetConfig();
    const response = await fetch(`${config.issuer}/api/integration.php`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
        cache: "no-store",
        redirect: "error",
    });
    return { response, data: await response.json() };
}

export const invenassetCookie = "daily_brief_invenasset_flow";
