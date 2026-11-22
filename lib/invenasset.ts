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

export function invenassetWebhookUrl(requestUrl: string, companyId: string) {
    const url = new URL(`/api/integrations/invenasset/webhook/${companyId}`, requestUrl);
    if (url.protocol === "http:" && process.env.NODE_ENV === "development") {
        url.protocol = "https:";
    }
    return url.toString();
}

export interface SupplyCreatePayloadItem {
    product_id: number;
    qty: number;
}

export function formatInvenassetSupplySummary(
    warehouseName: string,
    requests: { product_name: string; qty: number; unit?: string }[],
    note?: string
) {
    const parts = requests.map(r => `${r.product_name} (${r.qty}${r.unit ? ` ${r.unit}` : ""})`);
    const base = warehouseName ? `${warehouseName}: ${parts.join(", ")}` : parts.join(", ");
    const cleanNote = typeof note === "string" ? note.trim() : "";
    return cleanNote ? `${base} — ${cleanNote}` : base;
}

export async function submitInvenassetSupplyRequest(params: {
    companyId: string;
    token: string;
    invenassetCompanyId: number;
    requestUrl: string;
    sourceId: string;
    warehouseId: number;
    warehouseName: string;
    priority: number;
    note?: string;
    requesterName?: string;
    requesterEmail?: string;
    items: SupplyCreatePayloadItem[];
}) {
    const cleanItems = params.items
        .map(it => ({ product_id: Number(it.product_id), qty: Number(it.qty) }))
        .filter(it => Number.isInteger(it.product_id) && it.product_id > 0 && Number.isFinite(it.qty) && it.qty > 0);

    if (!Number.isInteger(params.warehouseId) || params.warehouseId <= 0 || !cleanItems.length) {
        throw Object.assign(new Error("invalid_value"), { status: 400 });
    }

    const { response, data } = await requestInvenasset({
        action: "supply.create",
        source_id: params.sourceId,
        warehouse_id: params.warehouseId,
        priority: params.priority,
        note: typeof params.note === "string" ? params.note.trim() : "",
        requester_name: params.requesterName ?? "",
        requester_email: params.requesterEmail ?? "",
        items: cleanItems,
        webhook_url: invenassetWebhookUrl(params.requestUrl, params.companyId),
    }, params.token);

    if (!response.ok || !data.success || !Array.isArray(data.requests) || data.company_id !== params.invenassetCompanyId) {
        throw Object.assign(new Error("invenasset_unavailable"), { status: 503 });
    }

    const requests = data.requests.map((r: any) => ({
        request_id: Number(r.request_id),
        product_id: Number(r.product_id),
        product_name: String(r.product_name || ""),
        custom_id: typeof r.custom_id === "string" ? r.custom_id : "",
        qty: Number(r.qty),
        unit: typeof r.unit === "string" && r.unit.trim() ? r.unit.trim() : "pcs",
        status: "Requested",
    }));

    return {
        company_id: Number(data.company_id),
        target: "supply" as const,
        warehouse_id: params.warehouseId,
        warehouse_name: params.warehouseName,
        status: "Requested",
        requests,
    };
}

export const invenassetCookie = "daily_brief_invenasset_flow";
