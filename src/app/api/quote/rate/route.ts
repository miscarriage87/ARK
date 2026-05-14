import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { cookies } from "next/headers";
import { z } from "zod";

const ratingSchema = z.object({
    quoteId: z.number().int().positive(),
    score: z.number().int().min(1).max(5)
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const parsed = ratingSchema.safeParse(body);
        const cookieStore = await cookies();
        const userId = req.headers.get("x-user-id") || cookieStore.get("ark_user_id")?.value;

        if (!userId || !parsed.success) {
            return NextResponse.json({ error: "Invalid data" }, { status: 400 });
        }

        const { quoteId, score } = parsed.data;
        const hasSeenQuote = await prisma.dailyView.findFirst({
            where: { userId, quoteId },
            select: { id: true }
        });

        if (!hasSeenQuote) {
            return NextResponse.json({ error: "Quote not available for user" }, { status: 403 });
        }

        const existingRating = await prisma.rating.findFirst({
            where: { userId, quoteId }
        });

        if (existingRating) {
            // Already rated. Optionally update score? For now, just return success (idempotent).
            // The user just wants to prevent duplicates.
            return NextResponse.json({ success: true, alreadyRated: true });
        }

        await prisma.rating.create({
            data: {
                userId,
                quoteId,
                score
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Rating error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
