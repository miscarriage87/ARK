import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDailyQuote } from "@/lib/ai-service";

/**
 * POST /api/quote/pregenerate
 *
 * Generiert das Zitat für den nächsten Tag im Hintergrund.
 * Wird nach Anzeige des heutigen Zitats aufgerufen (fire-and-forget).
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId } = body;

        if (!userId) {
            return NextResponse.json(
                { error: "userId ist erforderlich" },
                { status: 400 }
            );
        }

        // Berechne morgen
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split("T")[0];

        // Prüfe ob bereits existiert
        const existing = await prisma.dailyView.findUnique({
            where: {
                userId_date: {
                    userId,
                    date: tomorrowStr
                }
            }
        });

        if (existing) {
            return NextResponse.json({
                status: "already_exists",
                date: tomorrowStr
            });
        }

        // Generiere für morgen
        console.log(`[Pregenerate] Starte Vorgenerierung für User ${userId}, Datum ${tomorrowStr}`);
        await getDailyQuote(userId, tomorrowStr);
        console.log(`[Pregenerate] Vorgenerierung abgeschlossen für User ${userId}`);

        return NextResponse.json({
            status: "generated",
            date: tomorrowStr
        });

    } catch (error) {
        console.error("[Pregenerate] Fehler:", error);
        return NextResponse.json(
            { error: "Vorgenerierung fehlgeschlagen" },
            { status: 500 }
        );
    }
}
