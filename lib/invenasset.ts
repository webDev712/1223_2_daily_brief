import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import sql from "@/lib/db";

export function invenassetConfig() {
    const issuer = (process.env.INVENASSET_BASE_URL || "https://invenasset.com").replace(/\/$/, "");
    const key = Buffer.from(process.env.INVENASSET_TOKEN_ENCRYPTION_KEY || "", "base64");
    const origin = new URL(issuer);
    const local = process.env.NODE_ENV === "development";
    if (key.length !== 32
        || origin.origin !== issuer
        || (origin.protocol !== "https:" && !(local && origin.protocol === "http:" && ["localhost", "127.0.0.1"].includes(origin.hostname)))) {
        throw new Error("integration_not_configured");
    }
    return { issuer, key };
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
    return { companyId: saved.invenasset_company_id, token: decryptInvenasset(saved.token_encrypted, `connection:${companyId}`) };
}

export function encryptInvenasset(value: string, purpose: string) {
    const { key } = invenassetConfig();
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    cipher.setAAD(Buffer.from(purpose));
    const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

export function decryptInvenasset(value: string, purpose: string) {
    const { key } = invenassetConfig();
    const encrypted = Buffer.from(value, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", key, encrypted.subarray(0, 12));
    decipher.setAAD(Buffer.from(purpose));
    decipher.setAuthTag(encrypted.subarray(12, 28));
    return Buffer.concat([decipher.update(encrypted.subarray(28)), decipher.final()]).toString("utf8");
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
