import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ADMIN_SESSION_TTL_SECONDS, createAdminSessionToken, verifyAdminSessionToken } from "../admin-session";

describe("admin session tokens", () => {
    const originalPassword = process.env.ADMIN_PASSWORD;
    const originalSecret = process.env.ADMIN_SESSION_SECRET;

    beforeEach(() => {
        process.env.ADMIN_PASSWORD = "test-password";
        delete process.env.ADMIN_SESSION_SECRET;
    });

    afterEach(() => {
        if (originalPassword === undefined) delete process.env.ADMIN_PASSWORD;
        else process.env.ADMIN_PASSWORD = originalPassword;
        if (originalSecret === undefined) delete process.env.ADMIN_SESSION_SECRET;
        else process.env.ADMIN_SESSION_SECRET = originalSecret;
    });

    it("creates tokens that verify", () => {
        const token = createAdminSessionToken();
        expect(token).toBeTruthy();
        expect(verifyAdminSessionToken(token)).toBe(true);
    });

    it("rejects arbitrary cookie values and tampered tokens", () => {
        expect(verifyAdminSessionToken("anything")).toBe(false);
        expect(verifyAdminSessionToken("")).toBe(false);

        const token = createAdminSessionToken()!;
        const tampered = `${token.slice(0, -2)}00`;
        expect(verifyAdminSessionToken(tampered)).toBe(false);

        const [version, expires, nonce, signature] = token.split(".");
        expect(verifyAdminSessionToken(`${version}.${Number(expires) + 100}.${nonce}.${signature}`)).toBe(false);
    });

    it("expires after the TTL", () => {
        const issuedAt = Date.now();
        const token = createAdminSessionToken(issuedAt)!;
        expect(verifyAdminSessionToken(token, issuedAt + (ADMIN_SESSION_TTL_SECONDS - 1) * 1000)).toBe(true);
        expect(verifyAdminSessionToken(token, issuedAt + (ADMIN_SESSION_TTL_SECONDS + 1) * 1000)).toBe(false);
    });

    it("prefers ADMIN_SESSION_SECRET when configured", () => {
        const withPassword = createAdminSessionToken()!;
        process.env.ADMIN_SESSION_SECRET = "different-secret";
        expect(verifyAdminSessionToken(withPassword)).toBe(false);
        expect(verifyAdminSessionToken(createAdminSessionToken())).toBe(true);
    });

    it("refuses to issue tokens without a secret", () => {
        delete process.env.ADMIN_PASSWORD;
        expect(createAdminSessionToken()).toBeNull();
    });
});
