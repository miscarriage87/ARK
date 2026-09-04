import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { getDailyQuote } from "@/lib/ai-service";
import { addDays, formatAppDate, logger } from "@/lib/utils";

/**
 * GET /api/cron/pregenerate
 *
 * Daily pregeneration for all onboarded users without a leaf for tomorrow.
 * Secured via CRON_API_KEY (header x-cron-key or query ?key=), required in production.
 * Responds immediately and generates in the background to avoid scheduler timeouts.
 */
function keysMatch(provided: string | null, expected: string): boolean {
    if (!provided) return false;
    const a = Buffer.from(provided, "utf8");
    const b = Buffer.from(expected, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
}

async function generateInBackground(users: { id: string; name: string }[], dateStr: string) {
    const startTime = Date.now();
    let successCount = 0;
    let errorCount = 0;

    for (const user of users) {
        try {
            await getDailyQuote(user.id, dateStr);
            successCount++;
        } catch (error) {
            logger.error(`[Cron] Generation failed for user ${user.id}:`, error);
            errorCount++;
        }
    }

    logger.info(`[Cron] Finished ${dateStr} in ${Date.now() - startTime}ms: ${successCount} generated, ${errorCount} errors`);
}

export async function GET(req: NextRequest) {
    const apiKey = req.headers.get("x-cron-key") || req.nextUrl.searchParams.get("key");
    const expectedKey = process.env.CRON_API_KEY;

    if (process.env.NODE_ENV === "production" && !expectedKey) {
        return NextResponse.json({ error: "CRON_API_KEY is required in production" }, { status: 500 });
    }

    if (expectedKey && !keysMatch(apiKey, expectedKey)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const tomorrowStr = formatAppDate(addDays(new Date(), 1));

        const usersWithoutTomorrow = await prisma.user.findMany({
            where: {
                onboardingCompleted: true,
                views: { none: { date: tomorrowStr } }
            },
            select: { id: true, name: true }
        });

        const userCount = usersWithoutTomorrow.length;
        logger.info(`[Cron] ${userCount} users without a leaf for ${tomorrowStr}`);

        if (userCount === 0) {
            return NextResponse.json({
                status: "ok",
                message: "Keine User zu generieren",
                date: tomorrowStr,
                pending: 0
            });
        }

        // Fire-and-forget: the scheduler only needs the acknowledgement.
        void generateInBackground(usersWithoutTomorrow, tomorrowStr);

        return NextResponse.json({
            status: "started",
            message: `Generierung für ${userCount} User gestartet`,
            date: tomorrowStr,
            pending: userCount
        });
    } catch (error) {
        logger.error("[Cron] Fatal error:", error);
        return NextResponse.json({ error: "Cron-Job fehlgeschlagen" }, { status: 500 });
    }
}
