import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const { quoteId, score } = await req.json();
        const userId = req.headers.get("x-user-id");

        if (!userId || !quoteId || score === undefined) {
            return NextResponse.json({ error: "Invalid data" }, { status: 400 });
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
