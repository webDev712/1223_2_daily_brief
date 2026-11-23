import { getCurrentUser } from "@/lib/auth";
import sql, { pool } from "@/lib/db";

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

export async function requestInvenasset(body: Record<string, unknown>, token?: string, timeoutMs = 15000) {
    const config = invenassetConfig();
    const response = await fetch(`${config.issuer}/api/integration.php`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
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

export async function reconcileInvenassetBriefs(companyId: string, briefs: any[], directSourceIds: string[] = []): Promise<boolean> {
    if (!briefs.length && !directSourceIds.length) return false;
    let connection: { companyId: number; token: string };
    try {
        connection = await invenassetCompanyConnection(companyId);
    } catch {
        return false;
    }

    const issueReqIds = new Set<number>();
    const supplyReqIds = new Set<number>();
    const candidateBriefIds = new Set<number>();

    for (const brief of briefs) {
        const findings = Array.isArray(brief?.findings) ? brief.findings : [];
        let hasMatch = false;
        for (const f of findings) {
            if (Number(f?.invenasset?.company_id) !== connection.companyId) continue;
            if (f?.invenasset?.target === "supply" && Array.isArray(f.invenasset.requests)) {
                for (const rq of f.invenasset.requests) {
                    const rid = Number(rq?.request_id);
                    if (Number.isInteger(rid) && rid > 0) {
                        supplyReqIds.add(rid);
                        hasMatch = true;
                    }
                }
            } else if (f?.invenasset?.request_id != null) {
                const rid = Number(f.invenasset.request_id);
                if (Number.isInteger(rid) && rid > 0) {
                    issueReqIds.add(rid);
                    hasMatch = true;
                }
            }
        }
        if (hasMatch && Number.isInteger(Number(brief.id))) {
            candidateBriefIds.add(Number(brief.id));
        }
    }

    const cleanSourceIds = directSourceIds.filter(id => /^[a-f0-9-]{36}$/i.test(id)).slice(0, 200);
    const checkedIssueIds = new Set(Array.from(issueReqIds).slice(0, 200));
    const checkedSupplyIds = new Set(Array.from(supplyReqIds).slice(0, 200));
    if (!checkedIssueIds.size && !checkedSupplyIds.size && !cleanSourceIds.length) return false;

    const [issueSync, supplySync] = await Promise.all([
        (checkedIssueIds.size || cleanSourceIds.length)
            ? requestInvenasset({
                action: "issue.sync",
                request_ids: Array.from(checkedIssueIds),
                source_ids: cleanSourceIds,
            }, connection.token, 4000).catch(() => null)
            : Promise.resolve(null),
        (checkedSupplyIds.size || cleanSourceIds.length)
            ? requestInvenasset({
                action: "supply.sync",
                request_ids: Array.from(checkedSupplyIds),
                source_ids: cleanSourceIds,
            }, connection.token, 4000).catch(() => null)
            : Promise.resolve(null),
    ]);

    const issueOk = Boolean(issueSync?.response?.ok && issueSync.data?.connected && issueSync.data?.company_id === connection.companyId && issueSync.data?.by_request);
    const supplyOk = Boolean(supplySync?.response?.ok && supplySync.data?.connected && supplySync.data?.company_id === connection.companyId && supplySync.data?.by_request);
    if (!issueOk && !supplyOk) return false;

    const issueByReq: Record<string, { status: number; event_ts: number | null }> = issueOk ? issueSync!.data.by_request : {};
    const issueBySrc: Record<string, { deleted: boolean; items: { status: number; event_ts: number | null }[] }> = issueOk ? (issueSync!.data.by_source ?? {}) : {};
    const supplyByReq: Record<string, { status: number; event_ts: number | null }> = supplyOk ? supplySync!.data.by_request : {};
    const supplyBySrc: Record<string, { deleted: boolean; items: { status: number; event_ts: number | null }[] }> = supplyOk ? (supplySync!.data.by_source ?? {}) : {};

    const client = await pool.connect();
    let changed = false;
    try {
        await client.query("BEGIN");
        if (candidateBriefIds.size) {
            const lockedBriefs = await client.query(
                `SELECT id, findings FROM saved_brief WHERE company_id = $1 AND id = ANY($2::integer[]) FOR UPDATE`,
                [companyId, Array.from(candidateBriefIds)]
            );
            for (const row of lockedBriefs.rows) {
                const findings = Array.isArray(row.findings) ? row.findings : [];
                let briefChanged = false;
                const nextFindings: any[] = [];
                const deletedFindingIds: string[] = [];
                const resolvedUpdates: { findingId: string; ts: number | null }[] = [];

                for (const f of findings) {
                    if (Number(f?.invenasset?.company_id) !== connection.companyId) {
                        nextFindings.push(f);
                        continue;
                    }
                    if (f?.invenasset?.target === "supply" && Array.isArray(f.invenasset.requests) && supplyOk) {
                        const prevReqs = f.invenasset.requests;
                        const nextReqs: any[] = [];
                        let itemChanged = false;
                        for (const rq of prevReqs) {
                            const numRid = Number(rq?.request_id);
                            if (!checkedSupplyIds.has(numRid)) {
                                nextReqs.push(rq);
                                continue;
                            }
                            const rid = String(numRid);
                            if (!(rid in supplyByReq)) {
                                itemChanged = true;
                                continue;
                            }
                            const remote = supplyByReq[rid];
                            if (Number(remote.status) >= 1 && rq?.status !== "Ordered") {
                                itemChanged = true;
                                const orderedIso = new Date(((remote.event_ts || Math.floor(Date.now() / 1000))) * 1000).toISOString();
                                nextReqs.push({ ...rq, status: "Ordered", ordered_at: rq?.ordered_at || orderedIso });
                            } else {
                                nextReqs.push(rq);
                            }
                        }
                        if (!nextReqs.length) {
                            briefChanged = true;
                            if (f?.id) deletedFindingIds.push(String(f.id));
                            continue;
                        }
                        const allOrdered = nextReqs.every(rq => rq?.status === "Ordered");
                        const nextStatus = allOrdered ? "Ordered" : "Requested";
                        if (itemChanged || f.invenasset.status !== nextStatus) {
                            briefChanged = true;
                            const latestOrderedIso = nextReqs.map(rq => rq?.ordered_at).filter(Boolean).sort().pop() || new Date().toISOString();
                            nextFindings.push({
                                ...f,
                                invenasset: {
                                    ...f.invenasset,
                                    status: nextStatus,
                                    ...(allOrdered ? { resolved_at: f.invenasset.resolved_at || latestOrderedIso } : {}),
                                    requests: nextReqs,
                                },
                            });
                            if (allOrdered && f?.id) {
                                resolvedUpdates.push({
                                    findingId: String(f.id),
                                    ts: Math.floor(new Date(latestOrderedIso).getTime() / 1000) || null,
                                });
                            }
                        } else {
                            nextFindings.push(f);
                        }
                    } else if (f?.invenasset?.request_id != null && issueOk && checkedIssueIds.has(Number(f.invenasset.request_id))) {
                        const rid = String(Number(f.invenasset.request_id));
                        if (!(rid in issueByReq)) {
                            briefChanged = true;
                            if (f?.id) deletedFindingIds.push(String(f.id));
                            continue;
                        }
                        const remote = issueByReq[rid];
                        if (Number(remote.status) >= 4 && f.invenasset.status !== "Resolved") {
                            briefChanged = true;
                            const resolvedIso = new Date(((remote.event_ts || Math.floor(Date.now() / 1000))) * 1000).toISOString();
                            nextFindings.push({
                                ...f,
                                invenasset: {
                                    ...f.invenasset,
                                    status: "Resolved",
                                    resolved_at: resolvedIso,
                                },
                            });
                            if (f?.id) {
                                resolvedUpdates.push({ findingId: String(f.id), ts: remote.event_ts });
                            }
                        } else {
                            nextFindings.push(f);
                        }
                    } else {
                        nextFindings.push(f);
                    }
                }

                if (briefChanged) {
                    changed = true;
                    await client.query(
                        `UPDATE saved_brief SET findings = $1::jsonb, updated_at = clock_timestamp() WHERE id = $2 AND company_id = $3`,
                        [JSON.stringify(nextFindings), row.id, companyId]
                    );
                    if (deletedFindingIds.length) {
                        await client.query(
                            `DELETE FROM daily_log WHERE company_id = $1 AND saved_brief_id = $2 AND finding_id = ANY($3::text[])`,
                            [companyId, row.id, deletedFindingIds]
                        );
                    }
                    for (const resUpd of resolvedUpdates) {
                        await client.query(
                            `UPDATE daily_log SET status = 'Resolved', date_resolved = COALESCE(date_resolved, COALESCE(to_timestamp($1), clock_timestamp()))
                             WHERE company_id = $2 AND saved_brief_id = $3 AND finding_id = $4`,
                            [resUpd.ts, companyId, row.id, resUpd.findingId]
                        );
                    }
                }
            }
        }

        for (const sid of cleanSourceIds) {
            const issueEntry = issueBySrc[sid];
            const supplyEntry = supplyBySrc[sid];
            const entry = issueEntry || supplyEntry;
            if (!entry) continue;
            if (entry.deleted) {
                const del = await client.query(
                    `DELETE FROM daily_log WHERE id = $1::uuid AND company_id = $2::uuid RETURNING id`,
                    [sid, companyId]
                );
                if (del.rows.length) changed = true;
            } else if (Array.isArray(entry.items) && entry.items.length) {
                const threshold = issueEntry ? 4 : 1;
                if (entry.items.every(it => Number(it.status) >= threshold)) {
                    const latestTs = entry.items.map(it => Number(it.event_ts) || 0).filter(t => t > 0).sort((a, b) => b - a)[0] || null;
                    const upd = await client.query(
                        `UPDATE daily_log SET status = 'Resolved', date_resolved = COALESCE(date_resolved, COALESCE(to_timestamp($1), clock_timestamp()))
                         WHERE id = $2::uuid AND company_id = $3::uuid AND status <> 'Resolved' RETURNING id`,
                        [latestTs, sid, companyId]
                    );
                    if (upd.rows.length) changed = true;
                }
            }
        }

        await client.query("COMMIT");
    } catch {
        await client.query("ROLLBACK").catch(() => {});
        return false;
    } finally {
        client.release();
    }
    return changed;
}

export async function reconcileInvenassetDailyLogs(companyId: string, rows: any[]): Promise<boolean> {
    const briefIds = [...new Set(
        rows.map(r => Number(r?.saved_brief_id)).filter(id => Number.isInteger(id) && id > 0)
    )];
    const directSourceIds = rows
        .filter(r => r?.category === "Invenasset" && !r?.finding_id && /^[a-f0-9-]{36}$/i.test(String(r?.id ?? "")))
        .map(r => String(r.id));
    if (!briefIds.length && !directSourceIds.length) return false;
    const briefs = briefIds.length
        ? await sql(`SELECT id, findings FROM saved_brief WHERE company_id = $1 AND id = ANY($2::integer[])`, [companyId, briefIds])
        : [];
    return reconcileInvenassetBriefs(companyId, briefs, directSourceIds);
}

export const invenassetCookie = "daily_brief_invenasset_flow";
