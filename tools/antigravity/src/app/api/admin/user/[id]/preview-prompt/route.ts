import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    if (!(await cookies()).get("admin_session")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const prefs = user.preferences ? JSON.parse(user.preferences) : {};
    let aiConfig = {
        temperature: 1.15,
        modeWeights: { quote: 60, question: 30, pulse: 10 },
        masterPrompt: ""
    };

    if (user.aiConfig) {
        try {
            const parsed = JSON.parse(user.aiConfig);
            aiConfig = { ...aiConfig, ...parsed };
        } catch (e) { }
    }

    // Weighted Random Mode Selection for PREVIEW
    // For preview, we default to "QUOTE" but could allow user to switch?
    // Let's stick to QUOTE as the baseline example.
    const mode = "QUOTE";

    const DEFAULT_MASTER_PROMPT = `Handele als 'Soul-Coach' (inspiriert von Veit Lindau).
Das heutige Format ist: {{MODE}}.

Der Nutzer interessiert sich für: {{INTERESTS}}.
Wähle ein Thema davon.

ANWEISUNGEN FÜR {{MODE}}:
{{MODE_INSTRUCTIONS}}

ANALYSE (für alle Formate):
- Analysiere den Text auf schwierige/spannende Begriffe (Fremdwörter, Konzepte).
- Identifiziere 1-3 Begriff, die IM TEXT vorkommen.
- Falls der Text einfach ist, lass "concepts" leer.

Output JSON:
{
  "content": "Text des Zitats/Frage/Impuls",
  "author": "Name oder 'Reflexion'/'Impuls'",
  "explanation": "Kurze Deutung oder Coaching-Hinweis dazu (2-3 Sätze).",
  "category": "Kategorie (Ein Wort)",
  "concepts": [ { "word": "Begriff", "definition": "Erklärung" } ] 
}`;

    const MODE_INSTRUCTIONS = {
        QUOTE: `
- Suche ein tiefgründiges Zitat (deutsch).
- Autor kann bekannt sein oder 'Unbekannt'.`,
        QUESTION: `
- Formuliere eine RADIKALE, direkte Frage an den Nutzer ("Du"-Form).
- Beispiel: "Wofür bist du heute unendlich dankbar?"
- "author" Feld soll "Reflexion" sein.`,
        PULSE: `
- Formuliere einen kurzen, kraftvollen Impuls oder Mantra ("Du"-Form).
- Beispiel: "Atme tief ein. Das Leben ist jetzt."
- "author" Feld soll "Impuls" sein.`
    };

    let promptText = aiConfig.masterPrompt || DEFAULT_MASTER_PROMPT;

    // Substitution for Preview
    promptText = promptText.replace(/{{MODE}}/g, mode);
    promptText = promptText.replace(/{{INTERESTS}}/g, prefs.interests?.join(", ") || "Leben, Liebe, Erfolg");
    promptText = promptText.replace(/{{MODE_INSTRUCTIONS}}/g, MODE_INSTRUCTIONS[mode as keyof typeof MODE_INSTRUCTIONS] || "");

    return NextResponse.json({ prompt: promptText });
}
