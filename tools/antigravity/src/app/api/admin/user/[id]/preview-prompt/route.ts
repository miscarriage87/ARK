import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    if (!(await cookies()).get("admin_session")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const prefs = user.preferences ? JSON.parse(user.preferences) : {};
    let aiConfig = { temperature: 1.15, modeWeights: { quote: 60, question: 30, pulse: 10 }, customPrompt: "" };

    if (user.aiConfig) {
        try {
            const parsed = JSON.parse(user.aiConfig);
            aiConfig = { ...aiConfig, ...parsed };
        } catch (e) { }
    }

    // Weighted Random Mode Selection for PREVIEW (Just showing one possibility or all?)
    // Let's show the TEMPLATE with placeholders OR just generates one sample.
    // User wants "the actual prompt". Since prompt depends on MODE, I should show ONE example or explain it.
    // I will generate a sample prompt for "QUOTE" mode as default example.

    const mode = "QUOTE"; // Example

    const promptText = `User Context:
    Interests: ${prefs.interests || "Leben, Liebe, Erfolg"}
    
    System Instructions:
    Handele als 'Soul-Coach' (inspiriert von Veit Lindau), der den Nutzer aufwecken und berühren will.
    Das heutige Format ist: ${mode}.
    Wähle ein Thema davon.

    CUSTOM INSTRUCTIONS:
    ${aiConfig.customPrompt || "Keine besonderen Anweisungen."}

    ANWEISUNGEN FÜR ${mode}:
    - Suche ein tiefgründiges Zitat (deutsch).
    - Autor kann bekannt sein oder 'Unbekannt'.

    ANALYSE (für alle Formate):
    - Analysiere den Text auf schwierige/spannende Begriffe (Fremdwörter, Konzepte).
    - Identifiziere 1-3 Begriff, die IM TEXT vorkommen.
    - Falls der Text einfach ist, lass "concepts" leer.

    Output JSON:
    { "content": "...", "author": "...", "explanation": "...", "category": "...", "concepts": [...] }
    `;

    return NextResponse.json({ prompt: promptText });
}
