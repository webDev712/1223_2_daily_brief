import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { invenassetConfig } from "@/lib/invenasset";

export async function POST(request: NextRequest, {params}: {params: Promise<{companyId: string}>}) {
    const {companyId} = await params;
    if (!/^[a-f0-9-]{36}$/i.test(companyId)) return NextResponse.json({error: "Invalid company"}, {status: 400});
    const client = await pool.connect();
    try {
        const raw = await request.text();
        const signature = request.headers.get("x-invenasset-signature") || "";
        const rows = await client.query({text: "SELECT * FROM invenasset_connection WHERE company_id=$1", values: [companyId], query_timeout: 10000});
        const saved = rows.rows[0];
        if (!saved || saved.issuer !== invenassetConfig().issuer || new Date(saved.expires_at).getTime() <= Date.now()) return NextResponse.json({error: "Unknown connection"}, {status: 401});
        const token = saved.token_encrypted;
        const tokenHash = createHash("sha256").update(token).digest("hex");
        const expected = createHmac("sha256", tokenHash).update(raw).digest("hex");
        if (!/^[a-f0-9]{64}$/.test(signature) || !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return NextResponse.json({error: "Invalid signature"}, {status: 401});
        const event = JSON.parse(raw);
        const isIssueEvent = event.event === "issue.resolved" || event.event === "issue.deleted";
        const isSupplyEvent = event.event === "supply.ordered" || event.event === "supply.deleted";
        if ((!isIssueEvent && !isSupplyEvent)
            || event.company_id !== saved.invenasset_company_id
            || !Number.isInteger(event.request_id) || typeof event.source_id !== "string"
            || (event.event === "issue.resolved" && (!Number.isInteger(event.resolved_at) || event.resolved_at <= 0 || !Number.isInteger(event.status) || event.status < 4))
            || (event.event === "supply.ordered" && (!Number.isInteger(event.ordered_at) || event.ordered_at <= 0))) {
            return NextResponse.json({error: "Invalid event"}, {status: 400});
        }
        await client.query("BEGIN");
        if (isSupplyEvent) {
            const briefs = await client.query(`
                SELECT s.id, s.findings FROM saved_brief s WHERE s.company_id=$1 AND EXISTS (
                    SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(s.findings)='array' THEN s.findings ELSE '[]' END) f
                    WHERE f->>'id'=$2 AND f#>>'{invenasset,company_id}'=$3
                        AND EXISTS (
                            SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(f->'invenasset'->'requests')='array' THEN f->'invenasset'->'requests' ELSE '[]' END) rq
                            WHERE rq->>'request_id'=$4
                        )
                ) FOR UPDATE
            `, [companyId, event.source_id, String(event.company_id), String(event.request_id)]);
            if (!briefs.rows.length) {
                if (/^[a-f0-9-]{36}$/i.test(event.source_id)) {
                    const logRows = await client.query(`
                        SELECT id FROM daily_log WHERE id=$1::uuid AND company_id=$2::uuid FOR UPDATE
                    `, [event.source_id, companyId]);
                    if (logRows.rows.length) {
                        if (event.event === "supply.deleted") {
                            if (typeof event.remaining_active !== "number" || event.remaining_active <= 0) {
                                await client.query(`DELETE FROM daily_log WHERE id=$1::uuid AND company_id=$2::uuid`, [event.source_id, companyId]);
                            } else if (typeof event.remaining_open === "number" && event.remaining_open <= 0) {
                                await client.query(`UPDATE daily_log SET status='Resolved', date_resolved=COALESCE(date_resolved, clock_timestamp()) WHERE id=$1::uuid AND company_id=$2::uuid`, [event.source_id, companyId]);
                            }
                        } else if (typeof event.remaining_open !== "number" || event.remaining_open <= 0) {
                            await client.query(`
                                UPDATE daily_log SET status='Resolved', date_resolved=to_timestamp($1)
                                WHERE id=$2::uuid AND company_id=$3::uuid
                            `, [event.ordered_at, event.source_id, companyId]);
                        }
                        await client.query("COMMIT");
                        return NextResponse.json({success: true});
                    }
                }
                await client.query("ROLLBACK");
                return event.event === "supply.deleted"
                    ? NextResponse.json({success: true})
                    : NextResponse.json({error: "Supply request not found"}, {status: 404});
            }
            const briefId = briefs.rows[0].id;
            const currentFindings = Array.isArray(briefs.rows[0].findings) ? briefs.rows[0].findings : [];
            const orderedIso = event.event === "supply.ordered" ? new Date(event.ordered_at * 1000).toISOString() : "";
            let removeActionLog = false;
            let resolveActionLogTs: number | null = null;
            const nextFindings: any[] = [];
            for (const entry of currentFindings) {
                if (entry?.id !== event.source_id || !Array.isArray(entry?.invenasset?.requests)) {
                    nextFindings.push(entry);
                    continue;
                }
                if (event.event === "supply.deleted") {
                    const remainingReqs = entry.invenasset.requests.filter((rq: any) => Number(rq?.request_id) !== event.request_id);
                    if (!remainingReqs.length) {
                        removeActionLog = true;
                        continue;
                    }
                    const allOrdered = remainingReqs.every((rq: any) => rq?.status === "Ordered");
                    nextFindings.push({
                        ...entry,
                        invenasset: {
                            ...entry.invenasset,
                            status: allOrdered ? "Ordered" : "Requested",
                            ...(allOrdered ? { resolved_at: entry.invenasset.resolved_at || new Date().toISOString() } : {}),
                            requests: remainingReqs,
                        },
                    });
                    if (allOrdered) resolveActionLogTs = Math.floor(Date.now() / 1000);
                } else {
                    const updatedReqs = entry.invenasset.requests.map((rq: any) =>
                        Number(rq?.request_id) === event.request_id
                            ? { ...rq, status: "Ordered", ordered_at: orderedIso }
                            : rq
                    );
                    const allOrdered = updatedReqs.every((rq: any) => rq?.status === "Ordered");
                    nextFindings.push({
                        ...entry,
                        invenasset: {
                            ...entry.invenasset,
                            status: allOrdered ? "Ordered" : "Requested",
                            ...(allOrdered ? { resolved_at: orderedIso } : {}),
                            requests: updatedReqs,
                        },
                    });
                    if (allOrdered) resolveActionLogTs = event.ordered_at;
                }
            }
            await client.query(
                `UPDATE saved_brief SET findings=$1::jsonb, updated_at=clock_timestamp() WHERE id=$2 AND company_id=$3`,
                [JSON.stringify(nextFindings), briefId, companyId]
            );
            if (removeActionLog) {
                await client.query(`DELETE FROM daily_log WHERE company_id=$1 AND saved_brief_id=$2 AND finding_id=$3`, [companyId, briefId, event.source_id]);
            } else if (resolveActionLogTs !== null) {
                await client.query(`UPDATE daily_log SET status='Resolved', date_resolved=to_timestamp($1) WHERE company_id=$2 AND saved_brief_id=$3 AND finding_id=$4`, [resolveActionLogTs, companyId, briefId, event.source_id]);
            }
            await client.query("COMMIT");
            return NextResponse.json({success: true});
        }
        const briefs = await client.query(`
            SELECT s.id FROM saved_brief s WHERE s.company_id=$1 AND EXISTS (
                SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(s.findings)='array' THEN s.findings ELSE '[]' END) f
                WHERE f->>'id'=$2 AND f#>>'{invenasset,request_id}'=$3 AND f#>>'{invenasset,company_id}'=$4
            ) FOR UPDATE
        `, [companyId, event.source_id, String(event.request_id), String(event.company_id)]);
        if (!briefs.rows.length) {
            if (/^[a-f0-9-]{36}$/i.test(event.source_id)) {
                const logRows = await client.query(`
                    SELECT id FROM daily_log WHERE id=$1::uuid AND company_id=$2::uuid FOR UPDATE
                `, [event.source_id, companyId]);
                if (logRows.rows.length) {
                    if (event.event === "issue.deleted") {
                        await client.query(`
                            DELETE FROM daily_log WHERE id=$1::uuid AND company_id=$2::uuid
                        `, [event.source_id, companyId]);
                    } else {
                        await client.query(`
                            UPDATE daily_log SET status='Resolved', date_resolved=to_timestamp($1)
                            WHERE id=$2::uuid AND company_id=$3::uuid
                        `, [event.resolved_at, event.source_id, companyId]);
                    }
                    await client.query("COMMIT");
                    return NextResponse.json({success: true});
                }
            }
            await client.query("ROLLBACK");
            return event.event === "issue.deleted"
                ? NextResponse.json({success: true})
                : NextResponse.json({error: "Finding not found"}, {status: 404});
        }
        const briefId = briefs.rows[0].id;
        if (event.event === "issue.deleted") {
            await client.query(`
                UPDATE saved_brief SET findings=COALESCE((
                    SELECT jsonb_agg(item ORDER BY position)
                    FROM jsonb_array_elements(findings) WITH ORDINALITY entries(item, position)
                    WHERE item->>'id' <> $1
                ), '[]'::jsonb), updated_at=clock_timestamp()
                WHERE id=$2 AND company_id=$3
            `, [event.source_id, briefId, companyId]);
            await client.query(`
                DELETE FROM daily_log
                WHERE company_id=$1 AND saved_brief_id=$2 AND finding_id=$3
            `, [companyId, briefId, event.source_id]);
            await client.query("COMMIT");
            return NextResponse.json({success: true});
        }
        const result = JSON.stringify({status: "Resolved", resolved_at: new Date(event.resolved_at * 1000).toISOString()});
        await client.query(`
            UPDATE saved_brief SET findings=(
                SELECT jsonb_agg(CASE WHEN item->>'id'=$1 THEN
                    jsonb_set(item, '{invenasset}', (item->'invenasset') || $2::jsonb)
                    ELSE item END ORDER BY position)
                FROM jsonb_array_elements(findings) WITH ORDINALITY entries(item, position)
            ) WHERE id=$3 AND company_id=$4
        `, [event.source_id, result, briefId, companyId]);
        await client.query(`
            UPDATE daily_log SET status='Resolved', date_resolved=to_timestamp($1)
            WHERE company_id=$2 AND saved_brief_id=$3 AND finding_id=$4
        `, [event.resolved_at, companyId, briefId, event.source_id]);
        await client.query("COMMIT");
        return NextResponse.json({success: true});
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("InvenAsset webhook:", error);
        return NextResponse.json({error: "Webhook failed"}, {status: 500});
    } finally {
        client.release();
    }
}
