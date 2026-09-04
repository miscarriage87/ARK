import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { scheduleTasteProfileRefresh } from "@/lib/feedback-service";
import { scoreFromVerdict, verdictFromScore } from "@/lib/taste-profile";
import { isValidUUID, logger } from "@/lib/utils";

/**
 * POST /api/quote/rate
 *
 * One-time verdict per user and leaf: "up" (gut) or "down" (schlecht).
 * Legacy clients may still send a numeric score (5 = up, 1 = down).
 * Every new rating refreshes the user's taste profile in the background.
 */
const ratingSchema = z.object({
    quoteId: z.number().int().positive(),
    verdict: z.enum(["up", "down"]).optional(),
    score: z.number().int().min(1).max(5).optional()
}).refine((data) => data.verdict !== undefined || data.score !== undefined, {
    message: "verdict or score is required"
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => null);
        const parsed = ratingSchema.safeParse(body);
        const cookieStore = await cookies();
        const userId = req.headers.get("x-user-id") || cookieStore.get("ark_user_id")?.value;

        if (!userId || !isValidUUID(userId) || !parsed.success) {
            return NextResponse.json({ error: "Invalid data" }, { status: 400 });
        }

        const { quoteId } = parsed.data;
        const verdict = parsed.data.verdict ?? verdictFromScore(parsed.data.score ?? 5);

        const hasSeenQuote = await prisma.dailyView.findFirst({
            where: { userId, quoteId },
            select: { id: true }
        });

        if (!hasSeenQuote) {
            return NextResponse.json({ error: "Quote not available for user" }, { status: 403 });
        }

        const existingRating = await prisma.rating.findFirst({
            where: { userId, quoteId },
            select: { score: true }
        });

        if (existingRating) {
            return NextResponse.json({
                success: true,
                alreadyRated: true,
                verdict: verdictFromScore(existingRating.score)
            });
        }

        try {
            await prisma.rating.create({
                data: { userId, quoteId, score: scoreFromVerdict(verdict) }
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                const raced = await prisma.rating.findFirst({ where: { userId, quoteId }, select: { score: true } });
                return NextResponse.json({
                    success: true,
                    alreadyRated: true,
                    verdict: raced ? verdictFromScore(raced.score) : verdict
                });
            }
            throw error;
        }

        scheduleTasteProfileRefresh(userId);

        return NextResponse.json({ success: true, alreadyRated: false, verdict });
    } catch (error) {
        logger.error("[Rate] Rating error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
