import { NextRequest, NextResponse } from "next/server";
import { getDailyQuote } from "@/lib/ai-service";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
    console.log("[API] GET /api/quote/daily called");
    let userId = req.headers.get("x-user-id");

    if (!userId) {
        return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    try {
        // Ensure user exists
        let user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            // Check if there is a name-based user match for this ID? No, ID is primary.
            // Just create visitor.
            user = await prisma.user.create({
                data: {
                    id: userId,
                    name: "Visitor"
                }
            });
        }

        const quote = await getDailyQuote(userId);
        return NextResponse.json(quote);
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, interests } = body;

        if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

        console.log(`[API] Onboarding/Login for name: ${name}`);

        // 1. Check if user exists by Name
        let user = await prisma.user.findUnique({ where: { name } });
        let userId = user?.id;

        const cookieStore = await cookies();

        if (user) {
            console.log(`[API] Found existing user ${name} (${user.id}). Switching session.`);
            // Update prefs
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    preferences: JSON.stringify(body),
                    onboardingCompleted: true
                }
            });
        } else {
            // 2. No user by that name.
            // Should we rename the current session user OR create a brand new one?
            // If the current session user is "Visitor", we can claim it.
            // If the current session user is ALREADY someone else (e.g. "Bob"), we should create NEW.

            const currentSessionId = req.headers.get("x-user-id");
            const currentSessionUser = currentSessionId ? await prisma.user.findUnique({ where: { id: currentSessionId } }) : null;

            if (currentSessionUser && (currentSessionUser.name === "Visitor" || !currentSessionUser.onboardingCompleted)) {
                // Claim the session
                console.log(`[API] claiming session ${currentSessionId} for new user ${name}`);
                userId = currentSessionId!;
                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        name,
                        preferences: JSON.stringify(body),
                        onboardingCompleted: true
                    }
                });
            } else {
                // Create brand new
                console.log(`[API] Creating NEW user for ${name}`);
                const newUser = await prisma.user.create({
                    data: {
                        name,
                        preferences: JSON.stringify(body),
                        onboardingCompleted: true
                    }
                });
                userId = newUser.id;
            }
        }

        // 3. Set Cookie to the correct UserID
        // We use the response to set the cookie? No, we can use `cookies().set` in Server Actions or Route Handlers (NextJS 14+).
        // Check NextJS 16 docs (we are on 16). `cookies().set` works.
        cookieStore.set('ark_user_id', userId!, {
            path: '/',
            maxAge: 60 * 60 * 24 * 365,
            sameSite: 'strict'
        });

        // ERASE history for today to force new quote generation
        const today = new Date().toISOString().split("T")[0];
        try {
            await prisma.dailyView.delete({
                where: {
                    userId_date: {
                        userId: userId!,
                        date: today
                    }
                }
            });
            console.log(`[API] Cleared DailyView for user ${userId} to force regeneration.`);
        } catch (e) { }

        return NextResponse.json({ success: true, userId });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
}
