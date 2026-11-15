import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import sql, { pool } from "@/lib/db";
import { decryptInvenasset, encryptInvenasset, invenassetConfig, invenassetRequestConfig, invenassetCookie, invenassetOwner, requestInvenasset } from "@/lib/invenasset";

export async function GET() {
    const user = await invenassetOwner();
    if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    let config;
    try {
        config = invenassetConfig();
    } catch {
        return NextResponse.json({ configured: false, connection: null }, { headers: { "Cache-Control": "no-store" } });
    }
    try {
        const rows = await sql`SELECT invenasset_company_id, invenasset_company_name, token_encrypted, issuer, expires_at
            FROM invenasset_connection WHERE company_id=${user.company_id}`;
        if (!rows.length) return NextResponse.json({ configured: true, connection: null }, { headers: { "Cache-Control": "no-store" } });
        const saved = rows[0];
        const connection = { company_id: saved.invenasset_company_id, company_name: saved.invenasset_company_name, active: false };
        if (saved.issuer !== config.issuer || new Date(saved.expires_at).getTime() <= Date.now()) {
            return NextResponse.json({ configured: true, connection }, { headers: { "Cache-Control": "no-store" } });
        }
        const { response, data } = await requestInvenasset({ action: "status" },
            decryptInvenasset(saved.token_encrypted, `connection:${user.company_id}`));
        if (!response.ok && response.status !== 401 && response.status !== 403) throw new Error("unavailable");
        if (response.ok && data.connected === true && data.company?.id === saved.invenasset_company_id) {
            connection.active = true;
            connection.company_name = data.company.name;
        }
        return NextResponse.json({ configured: true, connection }, { headers: { "Cache-Control": "no-store" } });
    } catch {
        return NextResponse.json({ error: "integration_unavailable" }, { status: 503 });
    }
}

export async function POST(request: NextRequest) {
    const user = await invenassetOwner();
    if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    try {
        const config = invenassetRequestConfig(request);
        if (request.headers.get("origin") !== config.origin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        const state = randomBytes(32).toString("hex");
        const verifier = randomBytes(32).toString("base64url");
        const url = new URL("/integration_connect.php", config.issuer);
        url.search = new URLSearchParams({
            response_type: "code", redirect_uri: config.redirectUri, state,
            code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256",
        }).toString();
        const response = NextResponse.json({ url: url.toString() }, { headers: { "Cache-Control": "no-store" } });
        response.cookies.set(invenassetCookie, encryptInvenasset(JSON.stringify({
            state, verifier, userId: user.id, companyId: user.company_id, expires: Date.now() + 900000,
        }), "authorization"), {
            httpOnly: true, secure: config.origin.startsWith("https://"), sameSite: "lax",
            path: "/api/integrations/invenasset", maxAge: 900,
        });
        return response;
    } catch {
        return NextResponse.json({ error: "integration_not_configured" }, { status: 503 });
    }
}

export async function DELETE(request: NextRequest) {
    const user = await invenassetOwner();
    if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    try {
        const config = invenassetRequestConfig(request);
        if (request.headers.get("origin") !== config.origin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        const rows = await sql`SELECT token_encrypted, issuer FROM invenasset_connection WHERE company_id=${user.company_id}`;
        if (rows.length) {
            if (rows[0].issuer !== config.issuer) throw new Error("issuer_changed");
            const { response, data } = await requestInvenasset({ action: "revoke" },
                decryptInvenasset(rows[0].token_encrypted, `connection:${user.company_id}`));
            if (!response.ok || data.revoked !== true) throw new Error("revoke_failed");
            const client = await pool.connect();
            try {
                await client.query({
                    text: "DELETE FROM invenasset_connection WHERE company_id=$1 AND token_encrypted=$2 AND EXISTS (SELECT 1 FROM company WHERE id=$1 AND main_admin_id=$3)",
                    values: [user.company_id, rows[0].token_encrypted, user.id], query_timeout: 10000,
                });
            } finally {
                client.release();
            }
        }
        return NextResponse.json({ disconnected: true }, { headers: { "Cache-Control": "no-store" } });
    } catch {
        return NextResponse.json({ error: "integration_unavailable" }, { status: 503 });
    }
}
