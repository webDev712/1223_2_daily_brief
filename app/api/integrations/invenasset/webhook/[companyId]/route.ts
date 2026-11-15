import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { decryptInvenasset, invenassetConfig } from "@/lib/invenasset";

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
        const token = decryptInvenasset(saved.token_encrypted, `connection:${companyId}`);
        const tokenHash = createHash("sha256").update(token).digest("hex");
        const expected = createHmac("sha256", tokenHash).update(raw).digest("hex");
        if (!/^[a-f0-9]{64}$/.test(signature) || !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return NextResponse.json({error: "Invalid signature"}, {status: 401});
        const event = JSON.parse(raw);
        if (event.event !== "issue.resolved" || event.company_id !== saved.invenasset_company_id
            || !Number.isInteger(event.request_id) || typeof event.source_id !== "string"
            || !Number.isInteger(event.resolved_at) || event.resolved_at <= 0 || !Number.isInteger(event.status) || event.status < 4) return NextResponse.json({error: "Invalid event"}, {status: 400});
        await client.query("BEGIN");
        const briefs = await client.query(`
            SELECT s.id FROM saved_brief s WHERE s.company_id=$1 AND EXISTS (
                SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(s.findings)='array' THEN s.findings ELSE '[]' END) f
                WHERE f->>'id'=$2 AND f#>>'{invenasset,request_id}'=$3 AND f#>>'{invenasset,company_id}'=$4
            ) FOR UPDATE
        `, [companyId, event.source_id, String(event.request_id), String(event.company_id)]);
        if (!briefs.rows.length) {
            await client.query("ROLLBACK");
            return NextResponse.json({error: "Finding not found"}, {status: 404});
        }
        const briefId = briefs.rows[0].id;
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
