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
 */
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
        const startTime = Date.now();

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

        console.log(`[Cron] ${usersWithoutTomorrow.length} User ohne Zitat für ${tomorrowStr}`);

        const results: { userId: string; status: string }[] = [];

        // Generiere für jeden User
        for (const user of usersWithoutTomorrow) {
            try {
                console.log(`[Cron] Generiere für User ${user.name} (${user.id})`);
                await getDailyQuote(user.id, tomorrowStr);
                results.push({ userId: user.id, status: "generated" });
            } catch (error) {
                console.error(`[Cron] Fehler bei User ${user.id}:`, error);
                results.push({ userId: user.id, status: "error" });
            }
        }

        const duration = Date.now() - startTime;
        const successCount = results.filter(r => r.status === "generated").length;
        const errorCount = results.filter(r => r.status === "error").length;

        console.log(`[Cron] Abgeschlossen in ${duration}ms: ${successCount} generiert, ${errorCount} Fehler`);

        return NextResponse.json({
            date: tomorrowStr,
            total: usersWithoutTomorrow.length,
            generated: successCount,
            errors: errorCount,
            duration: `${duration}ms`
        });

    } catch (error) {
        console.error("[Cron] Kritischer Fehler:", error);
        return NextResponse.json(
            { error: "Cron-Job fehlgeschlagen" },
            { status: 500 }
        );
    }
}
