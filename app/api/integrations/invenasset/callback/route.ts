import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import sql, { pool } from "@/lib/db";
import { invenassetRequestConfig, invenassetCookie, invenassetOwner, requestInvenasset } from "@/lib/invenasset";

export async function GET(request: NextRequest) {
    const user = await invenassetOwner();
    if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const config = invenassetRequestConfig(request);
    const origin = config.origin;
    let status = "error";
    let issuedToken: string | null = null;
    try {
        const cookie = request.cookies.get(invenassetCookie)?.value;
        if (!user || !cookie) throw new Error("invalid_state");
        const pending = JSON.parse(Buffer.from(cookie, "base64url").toString("utf8"));
        const state = request.nextUrl.searchParams.get("state") || "";
        if (!/^[a-f0-9]{64}$/.test(state) || typeof pending.state !== "string" || pending.state.length !== state.length
            || !timingSafeEqual(Buffer.from(state), Buffer.from(pending.state))
            || pending.expires <= Date.now() || pending.userId !== user.id || pending.companyId !== user.company_id
            || request.nextUrl.searchParams.get("iss") !== config.issuer) throw new Error("invalid_state");
        if (request.nextUrl.searchParams.get("error")) {
            status = "cancelled";
        } else {
            const code = request.nextUrl.searchParams.get("code") || "";
            if (!/^[a-f0-9]{64}$/.test(code)) throw new Error("invalid_code");
            const saved = await sql`SELECT token_encrypted, issuer FROM invenasset_connection WHERE company_id=${user.company_id}`;
            const previousToken = saved.length && saved[0].issuer === config.issuer
                ? saved[0].token_encrypted : "";
            const { response, data } = await requestInvenasset({
                action: "exchange", code, code_verifier: pending.verifier,
                redirect_uri: config.redirectUri,
                previous_token: previousToken,
            });
            if (!response.ok || typeof data.access_token !== "string" || !/^ia_[a-f0-9]{64}$/.test(data.access_token)
                || data.scope !== "connection" || !Number.isInteger(data.company?.id) || data.company.id <= 0
                || typeof data.company.name !== "string" || !Number.isInteger(data.expires_at) || data.expires_at * 1000 <= Date.now()) {
                throw new Error("exchange_failed");
            }
            issuedToken = data.access_token;
            const client = await pool.connect();
            try {
                const result = await client.query({
                    text: `INSERT INTO invenasset_connection
                        (company_id, invenasset_company_id, invenasset_company_name, token_encrypted, issuer, connected_by, expires_at)
                        SELECT id, $2, $3, $4, $5, $6, to_timestamp($7) FROM company WHERE id=$1
                        ON CONFLICT (company_id) DO UPDATE SET
                            invenasset_company_id=EXCLUDED.invenasset_company_id, invenasset_company_name=EXCLUDED.invenasset_company_name,
                            token_encrypted=EXCLUDED.token_encrypted, issuer=EXCLUDED.issuer, connected_by=EXCLUDED.connected_by,
                            connected_at=now(), expires_at=EXCLUDED.expires_at
                        RETURNING company_id`,
                    values: [user.company_id, data.company.id, data.company.name, data.access_token, config.issuer, user.id, data.expires_at],
                    query_timeout: 10000,
                });
                if (!result.rows.length) throw new Error("owner_changed");
            } finally {
                client.release();
            }
            issuedToken = null;
            status = "connected";
        }
    } catch {
        if (issuedToken) {
            try {
                await requestInvenasset({ action: "revoke" }, issuedToken);
            } catch {}
        }
    }
    const response = NextResponse.redirect(new URL(`/settings?invenasset=${status}`, origin), 303);
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    response.cookies.set(invenassetCookie, "", {
        httpOnly: true, secure: origin.startsWith("https://"), sameSite: "lax",
        path: "/api/integrations/invenasset", maxAge: 0,
    });
    return response;
}
