import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { z } from "zod";

// Validierungs-Schemas
const uuidSchema = z.string().uuid("Ungültige User-ID");

const aiConfigSchema = z.object({
    temperature: z.number().min(0).max(2).optional(),
    modeWeights: z.object({
        quote: z.number().min(0).max(100),
        question: z.number().min(0).max(100),
        pulse: z.number().min(0).max(100)
    }).optional(),
    masterPrompt: z.string().max(10000).optional(),
    model: z.string().max(50).optional()
}).optional();

const preferencesSchema = z.object({
    interests: z.array(z.string().max(50)).max(10).optional()
}).optional();

const updateUserSchema = z.object({
    aiConfig: z.string().max(15000).optional(), // JSON string
    preferences: z.string().max(5000).optional() // JSON string
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    if (!(await cookies()).get("admin_session")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Validiere UUID Format
    const idResult = uuidSchema.safeParse(id);
    if (!idResult.success) {
        return NextResponse.json({ error: "Ungültige User-ID" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
        where: { id },
        include: {
            views: {
                take: 100, // Limit für Performance
                include: { quote: true },
                orderBy: { date: 'desc' }
            },
            ratings: {
                take: 100, // Limit für Performance
                include: { quote: true }
            }
        }
    });

    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    if (!(await cookies()).get("admin_session")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Validiere UUID Format
    const idResult = uuidSchema.safeParse(id);
    if (!idResult.success) {
        return NextResponse.json({ error: "Ungültige User-ID" }, { status: 400 });
    }

    let body;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
    }

    // Validiere Request Body
    const bodyResult = updateUserSchema.safeParse(body);
    if (!bodyResult.success) {
        return NextResponse.json({
            error: "Validierungsfehler",
            details: bodyResult.error.flatten()
        }, { status: 400 });
    }

    // Zusätzliche Validierung der JSON-Inhalte
    if (bodyResult.data.aiConfig) {
        try {
            const parsed = JSON.parse(bodyResult.data.aiConfig);
            const configResult = aiConfigSchema.safeParse(parsed);
            if (!configResult.success) {
                return NextResponse.json({
                    error: "Ungültige AI-Konfiguration",
                    details: configResult.error.flatten()
                }, { status: 400 });
            }
        } catch {
            return NextResponse.json({ error: "aiConfig ist kein gültiges JSON" }, { status: 400 });
        }
    }

    if (bodyResult.data.preferences) {
        try {
            const parsed = JSON.parse(bodyResult.data.preferences);
            const prefsResult = preferencesSchema.safeParse(parsed);
            if (!prefsResult.success) {
                return NextResponse.json({
                    error: "Ungültige Preferences",
                    details: prefsResult.error.flatten()
                }, { status: 400 });
            }
        } catch {
            return NextResponse.json({ error: "preferences ist kein gültiges JSON" }, { status: 400 });
        }
    }

    // User existiert?
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await prisma.user.update({
        where: { id },
        data: {
            aiConfig: bodyResult.data.aiConfig,
            preferences: bodyResult.data.preferences
        }
    });

    return NextResponse.json({ success: true });
}
