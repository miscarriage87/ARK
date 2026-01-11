import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDailyQuote } from "@/lib/ai-service";

/**
 * GET /api/cron/pregenerate
 *
 * Cron-Job Endpoint für tägliche Vorgenerierung.
 * Wird z.B. um 03:00 Uhr aufgerufen und generiert
 * Zitate für alle User, die noch kein Zitat für morgen haben.
 *
 * Optional mit API-Key gesichert über Query-Parameter oder Header.
 *
 * Wichtig: Antwortet sofort und führt Generierung im Hintergrund aus,
 * um Timeouts zu vermeiden.
 */

// Hintergrund-Generierung (wird nicht awaited)
async function generateInBackground(users: { id: string; name: string }[], dateStr: string) {
    const startTime = Date.now();
    let successCount = 0;
    let errorCount = 0;

    for (const user of users) {
        try {
            console.log(`[Cron] Generiere für User ${user.name} (${user.id})`);
            await getDailyQuote(user.id, dateStr);
            successCount++;
        } catch (error) {
            console.error(`[Cron] Fehler bei User ${user.id}:`, error);
            errorCount++;
        }
    }

    const duration = Date.now() - startTime;
    console.log(`[Cron] Abgeschlossen in ${duration}ms: ${successCount} generiert, ${errorCount} Fehler`);
}

export async function GET(req: NextRequest) {
    // Optional: API-Key Validierung
    const apiKey = req.headers.get("x-cron-key") || req.nextUrl.searchParams.get("key");
    const expectedKey = process.env.CRON_API_KEY;

    if (expectedKey && apiKey !== expectedKey) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    try {
        // Berechne morgen
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split("T")[0];

        console.log(`[Cron] Starte Vorgenerierung für ${tomorrowStr}`);

        // Alle aktiven User ohne Zitat für morgen
        const usersWithoutTomorrow = await prisma.user.findMany({
            where: {
                onboardingCompleted: true,
                views: {
                    none: {
                        date: tomorrowStr
                    }
                }
            },
            select: {
                id: true,
                name: true
            }
        });

        const userCount = usersWithoutTomorrow.length;
        console.log(`[Cron] ${userCount} User ohne Zitat für ${tomorrowStr}`);

        if (userCount === 0) {
            return NextResponse.json({
                status: "ok",
                message: "Keine User zu generieren",
                date: tomorrowStr,
                pending: 0
            });
        }

        // Starte Generierung im Hintergrund (ohne await!)
        generateInBackground(usersWithoutTomorrow, tomorrowStr);

        // Antworte sofort
        return NextResponse.json({
            status: "started",
            message: `Generierung für ${userCount} User gestartet`,
            date: tomorrowStr,
            pending: userCount
        });

    } catch (error) {
        console.error("[Cron] Kritischer Fehler:", error);
        return NextResponse.json(
            { error: "Cron-Job fehlgeschlagen" },
            { status: 500 }
        );
    }
}
