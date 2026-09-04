import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDailyQuote } from "@/lib/ai-service";
import { cookies } from "next/headers";
import { addDays, formatAppDate, isValidUUID, logger } from "@/lib/utils";

/**
 * POST /api/quote/pregenerate
 *
 * Generates tomorrow's leaf for the current user in the background.
 * Triggered by the client after today's leaf was shown (fire-and-forget).
 * The userId must match the session cookie.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => null);
        const userId = body && typeof body === "object" ? (body as { userId?: unknown }).userId : null;
        const cookieUserId = (await cookies()).get("ark_user_id")?.value;

        if (!userId || typeof userId !== "string" || !isValidUUID(userId)) {
            return NextResponse.json({ error: "userId ist erforderlich" }, { status: 400 });
        }

        if (!cookieUserId || cookieUserId !== userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const tomorrowStr = formatAppDate(addDays(new Date(), 1));

        const existing = await prisma.dailyView.findUnique({
            where: { userId_date: { userId, date: tomorrowStr } },
            select: { id: true }
        });

        if (existing) {
            return NextResponse.json({ status: "already_exists", date: tomorrowStr });
        }

        logger.info(`[Pregenerate] Generating ${tomorrowStr} for user ${userId}`);
        await getDailyQuote(userId, tomorrowStr);

        return NextResponse.json({ status: "generated", date: tomorrowStr });
    } catch (error) {
        logger.error("[Pregenerate] Failed:", error);
        return NextResponse.json({ error: "Vorgenerierung fehlgeschlagen" }, { status: 500 });
    }
}
