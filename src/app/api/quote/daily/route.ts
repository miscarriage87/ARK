import { NextRequest, NextResponse } from "next/server";
import { getDailyQuote } from "@/lib/ai-service";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { z } from "zod";
import { INTERESTS, MAX_INTERESTS } from "@/lib/constants";
import { isValidUUID, logger } from "@/lib/utils";

const onboardingSchema = z.object({
    name: z.string().trim().min(1).max(80),
    interests: z.array(z.enum(INTERESTS)).max(MAX_INTERESTS)
});

/**
 * GET /api/quote/daily
 * Returns today's leaf for the user identified by the x-user-id header.
 * Does not count as a real view (the app uses the server action for that).
 */
export async function GET(req: NextRequest) {
    const userId = req.headers.get("x-user-id");

    if (!userId || !isValidUUID(userId)) {
        return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    try {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const quote = await getDailyQuote(userId);
        return NextResponse.json(quote);
    } catch (error) {
        logger.error("[API] GET /api/quote/daily failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

/**
 * POST /api/quote/daily
 * Onboarding / settings: creates or updates the user by name and sets the session cookie.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => null);
        const parsed = onboardingSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({
                error: "Invalid onboarding data",
                details: parsed.error.flatten()
            }, { status: 400 });
        }

        const { name, interests } = parsed.data;
        const preferences = JSON.stringify({ name, interests });

        // 1. Existing user by name: update preferences and switch the session to them.
        const user = await prisma.user.findUnique({ where: { name } });
        let userId = user?.id;

        const cookieStore = await cookies();

        if (user) {
            logger.info(`[API] Updating preferences for existing user ${user.id}`);
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    preferences,
                    onboardingCompleted: true
                }
            });
        } else {
            // 2. No user by that name: claim an unfinished session user, otherwise create a new one.
            const currentSessionId = req.headers.get("x-user-id");
            const currentSessionUser = currentSessionId && isValidUUID(currentSessionId)
                ? await prisma.user.findUnique({ where: { id: currentSessionId } })
                : null;

            if (currentSessionUser && (currentSessionUser.name === "Visitor" || !currentSessionUser.onboardingCompleted)) {
                logger.info(`[API] Claiming session ${currentSessionId} for new user`);
                userId = currentSessionUser.id;
                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        name,
                        preferences,
                        onboardingCompleted: true
                    }
                });
            } else {
                logger.info("[API] Creating new user");
                const newUser = await prisma.user.create({
                    data: {
                        name,
                        preferences,
                        onboardingCompleted: true
                    }
                });
                userId = newUser.id;
            }
        }

        // 3. Bind the browser session to this user.
        cookieStore.set("ark_user_id", userId!, {
            path: "/",
            maxAge: 60 * 60 * 24 * 365,
            sameSite: "strict"
        });

        // History is kept on purpose: today's leaf stays, new preferences apply from tomorrow.
        return NextResponse.json({ success: true, userId });
    } catch (error) {
        logger.error("[API] POST /api/quote/daily failed:", error);
        return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
}
