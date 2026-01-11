import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";

// Rate limiting: Simple in-memory store (für Production: Redis verwenden)
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 Minuten

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

export async function POST(req: NextRequest) {
    const ip = getClientIP(req);

    // Rate Limiting Check
    if (isRateLimited(ip)) {
        return NextResponse.json(
            { error: "Zu viele Anmeldeversuche. Bitte warte 15 Minuten." },
            { status: 429 }
        );
    }

    const { password } = await req.json();
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
        console.error("[Admin Login] ADMIN_PASSWORD nicht in ENV konfiguriert!");
        return NextResponse.json({ error: "Server-Konfigurationsfehler" }, { status: 500 });
    }

    if (password === adminPassword) {
        // Generiere sicheres Session-Token
        const sessionToken = randomBytes(32).toString("hex");

        const cookieStore = await cookies();
        cookieStore.set("admin_session", sessionToken, {
            path: "/",
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 60 * 60 * 24 // 24 Stunden
        });

        // Reset Rate Limit bei erfolgreichem Login
        loginAttempts.delete(ip);

        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
