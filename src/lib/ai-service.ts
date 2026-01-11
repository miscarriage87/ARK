import OpenAI from "openai";
import { prisma } from "./prisma";
import { HistoryCompressor } from "./history-compressor";

const openai = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

// Debug Log
console.log("AI Service Init. Key present:", !!process.env.OPENAI_API_KEY);

// --- EXPORTED SYSTEM CONSTANTS (For Admin Visibility) ---

export const CATEGORY_STYLE_GUIDE = {
    "Achtsamkeit": `
- Pflicht: 1 konkretes Sinnesdetail (Geräusch, Textur, Licht, Temperatur).
- Fokus: Beobachten, Entschleunigung, Präsenz.
- Vermeide: Esoterik-Floskeln, "Universum".`,

    "Spiritualität": `
- Pflicht: Perspektive 'Größer als ich' (Verbindung, Sinn, Staunen).
- Ton: Tiefgründig, aber geerdet (kein "Licht & Liebe" Kitsch).
- Vermeide: Dogma, strafender Gott.`,

    "Stoizismus": `
- Pflicht: Fokus auf das, was kontrollierbar ist (Innenwelt vs Außenwelt).
- Ton: Rational, stärkend, nüchtern, "Amor Fati".
- Schlagworte: Tugend, Vernunft, Akzeptanz, Charakter.`,

    "Unternehmertum": `
- Pflicht: Fokus auf Wertschöpfung, Problemlösung oder Resilienz.
- Ton: High Agency, proaktiv, risikobewusst, "Skin in the Game".
- Vermeide: Passivität, "Hoffnung", "Glück haben".`,

    "Wissenschaft": `
- Pflicht: Neugier, Hypothese, Experiment oder kosmische Perspektive.
- Ton: Rationales Staunen, evidenzbasiert, präzise.
- Metaphern: Labor, Naturgesetze, Evolution, Kosmos.`,

    "Kunst": `
- Pflicht: Ausdruck, Perspektivwechsel, Schönheit im Hässlichen.
- Ton: Expressiv, brechend, subjektiv, emotional.
- Fokus: Der kreative Akt als Lebenshaltung.`,

    "Poesie": `
- Pflicht: Fokus auf Sprachmelodie, starke Metaphern, Verdichtung.
- Ton: Lyrisch, sanft, aber bildgewaltig.
- Stil: Nutze Alliteration oder Rhythmus.`,

    "Führung": `
- Pflicht: Verantwortung, Dienen, Klarheit, schwierige Entscheidungen.
- Ton: Souverän, fordernd aber unterstützend (Servant Leadership).
- Vermeide: Management-Speak, "Synergien".`,

    "Wellness": `
- Pflicht: Körper-Geist-Verbindung, Energie-Management, Erholung.
- Ton: Fürsorglich, biologisch fundiert, vital.
- Fokus: Schlaf, Bewegung, Ernährung, Stressabbau.`,

    "DEFAULT": `
- Pflicht: Fokus auf ECHTE Erfahrung, nicht Theorie.
- Ton: Modern, direkt, 'No-BS'.
- Vermeide Metaphysik wenn nicht explizit gefordert.`
};

export const ARCHETYPES_FOR_MODE = {
    QUOTE: ["Paradox", "Aphorismus-Regel", "Mini-Metapher", "Koan-light", "Beobachtung", "Konsequenz-Satz"],
    QUESTION: ["Werte-Check", "Schatten-Spotlight", "Mikro-Experiment", "Reframing", "Beziehungs-Spiegel", "Kosten-der-Ausrede"],
    PULSE: ["10-Sekunden-Aktion", "Wenn-Dann-Schalter", "Mut-Trigger", "Fokus-Satz", "Paradox-Impuls", "Grenze-setzen"]
};

export const MODE_INSTRUCTIONS = {
    QUOTE: `
- Erzeuge einen ORIGINAL-Aphorismus (kein echtes Zitat behaupten).
- author: "Einsicht"
- Kein Fragezeichen.`,
    QUESTION: `
- Formuliere eine radikale, direkte Frage in Du-Form.
- Keine Standardfragen, kein "Was hält dich ab".
- author: "Reflexion"`,
    PULSE: `
- Formuliere einen kurzen Impuls/Mantra in Du-Form, handlungsnah.
- Kein Atem, keine Stille.
- author: "Impuls"`
};

export const DEFAULT_MASTER_PROMPT = `
Du bist ein präziser, moderner Soul-Coach (geerdet, klar, nicht kitschig).
Format heute: {{MODE}}. 
Kategorie (THEMA): {{CATEGORY}} (Bleibe strikt in dieser Themenwelt).

User-Interessen: {{INTERESTS}}.

KONTEXT: Der User hat schon viel konsumiert.
Verbotene Autoren (A): {{BANNED_AUTHORS}}
Vermeide Konzepte (C): {{BANNED_CONCEPTS}} (außer explizit in INTERESTS)
HISTORY (letzte Outputs + Meta): {{HISTORY_CODE}}

HARTREGELN (Anti-Klischee):
- Kein Start mit: "Was hält dich davon ab", "Fühle", "In der Stille"
- Vermeide: "Tauch ein", "Lass los", "Hier und Jetzt", "Atem", "Präsenz"
- Keine Floskeln über "Seele/Universum" (außer Kategorie verlangt es explizit)
- content muss kurz sein (70–140 Zeichen), stark, konkret.

KATEGORIE-LINSE (entscheidend - hat Vorrang vor allem Anderen):
{{CATEGORY_STYLE_GUIDE}}

DIVERSITÄTS-MOTOR:
1) Wähle genau EINEN Archetyp aus der Liste für {{MODE}}: {{ARCHETYPES_FOR_MODE}}
2) INSPIRATION für Bildwelten (Optional - nur nutzen wenn es zur Kategorie passt!):
   Technik / Naturdetail / Körper (ohne Atem) / Beziehung / Arbeit / Stadt / Kindheit / Geld / Zeit / Risiko.
   WICHTIG: Wenn die Bildwelt der Kategorie widerspricht (z.B. Technik bei Achtsamkeit), ignoriere sie und wähle eine kategorie-konforme Metapher.
3) Check: Wenn Metapher ähnlich zu einem der letzten 7 Einträge: neu würfeln.

MODE-INSTRUKTIONEN:
{{MODE_INSTRUCTIONS}}

ANALYSE (concepts):
- Extrahiere 1–3 spannende Begriffe, die IM content vorkommen (Fremdwort/Konzept).
- Wenn content sehr simpel ist: concepts = [].

Output JSON (exakt):
{
  "content": "...",
  "author": "...",
  "explanation": "... (2-3 Sätze, praktisch, nicht kitschig)",
  "category": "{{CATEGORY}}",
  "concepts": [ { "word": "...", "definition": "..." } ]
}
`;

export async function getDailyQuote(userId: string, forcedDate?: string) {
    const today = forcedDate || new Date().toISOString().split("T")[0];

    // 1. Check if user already saw a quote today
    const history = await prisma.dailyView.findUnique({
        where: {
            userId_date: {
                userId,
                date: today,
            },
        },
        include: {
            quote: true,
        },
    });

    if (history) {
        console.log(`[QuoteService] History found for user ${userId}. Returning cached quote.`);
        const rating = await prisma.rating.findFirst({ where: { userId, quoteId: history.quoteId } });
        return {
            ...history.quote,
            isNew: false,
            isLiked: !!rating
        };
    }

    // 2. Generate or Fetch new quote
    let quoteData: any;
    let usedModel = "offline";
    console.log(`[QuoteService] Generating for User: ${userId}`);

    if (openai) {
        console.log("[QuoteService] OpenAI Client Active. Attempting generation...");
        try {
            // Get User Preferences & Admin Config
            const user = await prisma.user.findUnique({ where: { id: userId } });
            console.log("DEBUG: User found:", !!user);
            console.log("DEBUG: User Prefs Raw:", user?.preferences);
            const prefs = user?.preferences ? (JSON.parse(user.preferences) || {}) : {};
            console.log("DEBUG: Parsed Prefs:", prefs);
            let aiConfig = {
                temperature: 1.0,
                modeWeights: { quote: 50, question: 30, pulse: 20 },
                masterPrompt: "",
                model: "gpt-5" // Default to High-End Model (Future Proof)
            };

            if (user?.aiConfig) {
                try {
                    const parsed = JSON.parse(user.aiConfig);
                    aiConfig = { ...aiConfig, ...parsed };
                    console.log(`[QuoteService] Using Admin Config for user ${userId}`, aiConfig);
                } catch (e) { console.error("Invalid AI Config", e); }
            }

            // Weighted Random Mode Selection
            const modes = [];
            for (let i = 0; i < aiConfig.modeWeights.quote; i++) modes.push("QUOTE");
            for (let i = 0; i < aiConfig.modeWeights.question; i++) modes.push("QUESTION");
            for (let i = 0; i < aiConfig.modeWeights.pulse; i++) modes.push("PULSE");
            // Fallback if weights are 0
            if (modes.length === 0) modes.push("QUOTE");

            const mode = modes[Math.floor(Math.random() * modes.length)];

            // Fetch compressed history (Forbidden Tokens)
            // PROTECT user interests from being banned
            console.log("DEBUG: Accessing prefs.interests for protectedTerms");
            const protectedTerms = Array.isArray(prefs?.interests) ? prefs.interests : [];
            const historyData = await HistoryCompressor.calculateUserHistoryCode(userId, protectedTerms);

            console.log(`[QuoteService] History Code: ${historyData.fullCode.substring(0, 50)}...`);

            // --- Advanced Prompt Logic ---

            // 1. Determine Category
            // Pick a random interest from user prefs, or default to general categories if empty
            console.log("DEBUG: Determining Category");
            // STRICT: Only use user interests if they exist.
            const interestPool = (Array.isArray(prefs?.interests) && prefs.interests.length > 0)
                ? prefs.interests
                : ["Achtsamkeit", "Spiritualität", "Mut", "Erfolg", "Liebe"]; // Fallback only if NO interests selected

            const targetCategory = interestPool[Math.floor(Math.random() * interestPool.length)];

            const styleGuide = CATEGORY_STYLE_GUIDE[targetCategory as keyof typeof CATEGORY_STYLE_GUIDE] || CATEGORY_STYLE_GUIDE["DEFAULT"];

            const archetypes = ARCHETYPES_FOR_MODE[mode as keyof typeof ARCHETYPES_FOR_MODE] || ["Standard"];
            const archetypeListStr = archetypes.join(", ");

            let masterPrompt = aiConfig.masterPrompt || DEFAULT_MASTER_PROMPT;

            // Variable Substitution
            masterPrompt = masterPrompt.replace(/{{MODE}}/g, mode);
            masterPrompt = masterPrompt.replace(/{{INTERESTS}}/g, prefs.interests?.join(", ") || "Leben, Liebe, Erfolg");
            masterPrompt = masterPrompt.replace(/{{CATEGORY}}/g, targetCategory);
            masterPrompt = masterPrompt.replace(/{{BANNED_AUTHORS}}/g, historyData.authorsString || "Keine");
            masterPrompt = masterPrompt.replace(/{{BANNED_CONCEPTS}}/g, historyData.conceptsString || "Keine");
            masterPrompt = masterPrompt.replace(/{{HISTORY_CODE}}/g, historyData.fullCode || "(Neu)");

            masterPrompt = masterPrompt.replace(/{{CATEGORY_STYLE_GUIDE}}/g, styleGuide);
            masterPrompt = masterPrompt.replace(/{{ARCHETYPES_FOR_MODE}}/g, archetypeListStr);
            masterPrompt = masterPrompt.replace(/{{MODE_INSTRUCTIONS}}/g, MODE_INSTRUCTIONS[mode as keyof typeof MODE_INSTRUCTIONS] || "");

            console.log("[QuoteService] Final Prompt sent to OpenAI (User defined OR System default):", masterPrompt);

            // Use the configured model (e.g., gpt-5, gpt-5-mini, gpt-4o)
            console.log(`[QuoteService] Using Model: ${aiConfig.model}`);

            // 1. Force Temperature=1 for GPT-5 (Strict API Requirement)
            if (aiConfig.model.includes("gpt-5") || aiConfig.model.includes("o1") || aiConfig.model.includes("o3")) {
                console.log("[QuoteService] Enforcing Temperature=1.0 for High-Reasoning Model");
                aiConfig.temperature = 1.0;
            }
            usedModel = aiConfig.model;

            const completion = await openai.chat.completions.create({
                model: aiConfig.model,
                messages: [
                    { role: "system", content: "Du bist ein intellektueller Mentor." },
                    { role: "user", content: masterPrompt }
                ],
                response_format: { type: "json_object" },
                temperature: aiConfig.temperature
            });

            const content = completion.choices[0].message.content;
            if (content) {
                quoteData = JSON.parse(content);
            }
        } catch (error) {
            console.error("OpenAI Error:", error);
            // Fallback to mock logic will trigger if quoteData is still null
        }
    }

    // Criticial Error if Generation Failed
    if (!quoteData) {
        throw new Error("No OpenAI Client Configured or Generation failed");
    } else {
        console.log("[QuoteService] OpenAI Success. Content:", quoteData.content.substring(0, 20) + "...");
    }

    // 3. Save to DB
    // Handle concepts safely (might be array from AI or string from Mock)
    let conceptsStr = null;
    if (quoteData.concepts) {
        conceptsStr = typeof quoteData.concepts === 'string'
            ? quoteData.concepts
            : JSON.stringify(quoteData.concepts);
    }

    const quote = await prisma.quote.create({
        data: {
            content: quoteData.content,
            author: quoteData.author,
            explanation: quoteData.explanation,
            category: quoteData.category,
            concepts: conceptsStr,
            sourceModel: usedModel
        }
    });

    // 4. Record View (if new)
    // 4. Record View (if new)
    if (!history) {
        try {
            await prisma.dailyView.create({
                data: {
                    userId,
                    quoteId: quote.id,
                    date: today
                }
            });
        } catch (error: any) {
            // Race Condition Handling:
            // If we hit P2002 (Unique Constraint), it means another request created the view 
            // WHILE we were generating. We should discard our just-generated quote (orphaned)
            // and return the one from the winning request to stay consistent.
            if (error.code === 'P2002') {
                console.warn(`[QuoteService] Race condition detected for user ${userId} on ${today}. Fetching winner.`);
                const winner = await prisma.dailyView.findUnique({
                    where: {
                        userId_date: { userId, date: today }
                    },
                    include: { quote: true }
                });

                if (winner) {
                    return {
                        ...winner.quote,
                        isNew: false, // It's technically not "new" anymore as the user has "seen" it in the other request context
                        isLiked: false // Likelihood of liking in <1s is 0
                    };
                }
            }
            // If it's another error, or we somehow can't find the winner, re-throw or return current
            console.error("[QuoteService] Error creating dailyView:", error);
            // We return the current quote anyway, worst case the view isn't recorded but the user sees content.
        }
    }

    // Check if liked
    const rating = await prisma.rating.findFirst({
        where: { userId, quoteId: quote.id }
    });

    return { ...quote, isNew: !history, isLiked: !!rating };
}
