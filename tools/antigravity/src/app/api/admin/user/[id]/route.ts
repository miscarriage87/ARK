import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    if (!(await cookies()).get("admin_session")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const user = await prisma.user.findUnique({
        where: { id },
        include: {
            views: {
                include: { quote: true },
                orderBy: { date: 'desc' }
            },
            ratings: { include: { quote: true } }
        }
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json(user);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    if (!(await cookies()).get("admin_session")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const body = await req.json();

    await prisma.user.update({
        where: { id },
        data: {
            aiConfig: body.aiConfig,
            preferences: body.preferences // Allow updating preferences (interests)
        }
    });

    return NextResponse.json({ success: true });
}
