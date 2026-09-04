import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

/**
 * Stateless, signed admin session tokens.
 *
 * Format: v1.<expiresAtSeconds>.<nonce>.<hmac>
 * The HMAC is derived from ADMIN_SESSION_SECRET (or, as a fallback, ADMIN_PASSWORD),
 * so a client cannot forge a session simply by setting an arbitrary cookie value.
 */

export const ADMIN_SESSION_COOKIE = "admin_session";
export const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 24; // 24h

const TOKEN_VERSION = "v1";

function sessionSecret(): string | null {
    const raw = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;
    if (!raw) return null;
    return createHash("sha256").update(`ark-admin-session:${raw}`).digest("hex");
}

function sign(payload: string, secret: string): string {
    return createHmac("sha256", secret).update(payload).digest("hex");
}

export function createAdminSessionToken(now: number = Date.now()): string | null {
    const secret = sessionSecret();
    if (!secret) return null;

    const expiresAt = Math.floor(now / 1000) + ADMIN_SESSION_TTL_SECONDS;
    const nonce = randomBytes(16).toString("hex");
    const payload = `${TOKEN_VERSION}.${expiresAt}.${nonce}`;

    return `${payload}.${sign(payload, secret)}`;
}

export function verifyAdminSessionToken(token: string | null | undefined, now: number = Date.now()): boolean {
    if (!token) return false;

    const secret = sessionSecret();
    if (!secret) return false;

    const parts = token.split(".");
    if (parts.length !== 4) return false;

    const [version, expiresAtRaw, nonce, signature] = parts;
    if (version !== TOKEN_VERSION || !/^\d+$/.test(expiresAtRaw) || !/^[0-9a-f]{32}$/.test(nonce)) {
        return false;
    }

    const expiresAt = Number(expiresAtRaw);
    if (!Number.isFinite(expiresAt) || expiresAt * 1000 <= now) return false;

    const expected = sign(`${version}.${expiresAtRaw}.${nonce}`, secret);
    if (expected.length !== signature.length) return false;

    return timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(signature, "utf8"));
}
