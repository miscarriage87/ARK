import { NextRequest, NextResponse } from "next/server";
import { getDailyQuote } from "@/lib/ai-service";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    console.log("[API] GET /api/quote/daily called");
    const userId = req.headers.get("x-user-id");

    if (!userId) {
        return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    try {
        // Ensure user exists
        let user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
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
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "No User" }, { status: 401 });

    try {
        const body = await req.json();
        // Upsert user preference
        await prisma.user.upsert({
            where: { id: userId },
            update: {
                preferences: JSON.stringify(body),
                onboardingCompleted: true,
                name: body.name
            },
            create: {
                id: userId,
                preferences: JSON.stringify(body),
                onboardingCompleted: true,
                name: body.name
            }
        });
        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
}
