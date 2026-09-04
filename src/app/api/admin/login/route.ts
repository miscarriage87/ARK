import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { timingSafeEqual } from "crypto";
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_TTL_SECONDS, createAdminSessionToken } from "@/lib/admin-session";
import { logger } from "@/lib/utils";

// Rate limiting: simple in-memory store (single instance deployment)
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function getClientIP(req: NextRequest): string {
    return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
        || req.headers.get("x-real-ip")
        || "unknown";
}

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const record = loginAttempts.get(ip);

    if (!record || now > record.resetAt) {
        loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
        return false;
    }

    if (record.count >= MAX_ATTEMPTS) {
        return true;
    }

    record.count++;
    return false;
}

function passwordsMatch(provided: unknown, expected: string): boolean {
    if (typeof provided !== "string") return false;
    const a = Buffer.from(provided, "utf8");
    const b = Buffer.from(expected, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
    const ip = getClientIP(req);

    if (isRateLimited(ip)) {
        return NextResponse.json(
            { error: "Zu viele Anmeldeversuche. Bitte warte 15 Minuten." },
            { status: 429 }
        );
    }

    const body = await req.json().catch(() => null);
    const password = body && typeof body === "object" ? (body as { password?: unknown }).password : undefined;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
        logger.error("[Admin Login] ADMIN_PASSWORD is not configured");
        return NextResponse.json({ error: "Server-Konfigurationsfehler" }, { status: 500 });
    }

    if (!passwordsMatch(password, adminPassword)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionToken = createAdminSessionToken();
    if (!sessionToken) {
        logger.error("[Admin Login] Could not create a signed session token");
        return NextResponse.json({ error: "Server-Konfigurationsfehler" }, { status: 500 });
    }

    const cookieStore = await cookies();
    cookieStore.set(ADMIN_SESSION_COOKIE, sessionToken, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: ADMIN_SESSION_TTL_SECONDS
    });

    loginAttempts.delete(ip);

    return NextResponse.json({ success: true });
}
