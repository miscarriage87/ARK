import OpenAI from "openai";
import { prisma } from "./prisma";

const openai = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

// Debug Log
console.log("AI Service Init. Key present:", !!process.env.OPENAI_API_KEY);

// Mock data for fallback
const MOCK_QUOTES = [
    {
        content: "Der einzige Weg, großartige Arbeit zu leisten, ist zu lieben, was man tut.",
        author: "Steve Jobs",
        explanation: "Leidenschaft ist der Treibstoff für Exzellenz.",
        category: "Motivation",
        concepts: JSON.stringify([{ word: "Leidenschaft", definition: "Starkes Gefühl der Begeisterung" }])
    },
    {
        content: "In der Mitte der Schwierigkeit liegt die Gelegenheit.",
        author: "Albert Einstein",
        explanation: "Herausforderungen verbergen oft die besten Chancen für Wachstum.",
        category: "Weisheit",
        concepts: JSON.stringify([{ word: "Gelegenheit", definition: "Günstiger Umstand" }])
    },
    {
        content: "Das Glück hängt von uns selbst ab.",
        author: "Aristoteles",
        explanation: "Äußere Umstände definieren nicht deinen inneren Zustand.",
        category: "Philosophie",
        concepts: JSON.stringify([{ word: "Glück", definition: "Subjektives Wohlbefinden" }])
    }
];

export async function getDailyQuote(userId: string) {
    const today = new Date().toISOString().split("T")[0];

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
        return {
            ...history.quote,
            isNew: false
        };
    }

    // 2. Generate or Fetch new quote
    let quoteData: any;
    console.log(`[QuoteService] Generating for User: ${userId}`);

    if (openai) {
        console.log("[QuoteService] OpenAI Client Active. Attempting generation...");
        try {
            // Get User Preferences
            const user = await prisma.user.findUnique({ where: { id: userId } });
            const prefs = user?.preferences ? JSON.parse(user.preferences) : {};

            // Randomly select mode: Quote (60%), Question (30%), Pulse (10%)
            const modes = ["QUOTE", "QUOTE", "QUOTE", "QUOTE", "QUOTE", "QUOTE", "QUESTION", "QUESTION", "QUESTION", "PULSE"];
            const mode = modes[Math.floor(Math.random() * modes.length)];

            const prompt = `Handele als 'Soul-Coach' (inspiriert von Veit Lindau), der den Nutzer aufwecken und berühren will.
            Das heutige Format ist: ${mode}.
            
            Der Nutzer interessiert sich für: ${prefs.interests || "Leben, Liebe, Erfolg"}.
            Wähle ein Thema davon.

            ANWEISUNGEN FÜR ${mode}:
            ${mode === "QUOTE" ? `
            - Suche ein tiefgründiges Zitat (deutsch).
            - Autor kann bekannt sein oder 'Unbekannt'.
            ` : mode === "QUESTION" ? `
            - Formuliere eine RADIKALE, direkte Frage an den Nutzer ("Du"-Form).
            - Beispiel: "Wofür bist du heute unendlich dankbar?" oder "Was würdest du tun, wenn du keine Angst hättest?"
            - "author" Feld soll "Reflexion" sein.
            ` : `
            - Formuliere einen kurzen, kraftvollen Impuls oder Mantra ("Du"-Form).
            - Beispiel: "Atme tief ein. Das Leben ist jetzt."
            - "author" Feld soll "Impuls" sein.
            `}

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
            }
            `;

            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "Du bist ein intellektueller Mentor. Du schätzt präzise Sprache und Vielfalt." },
                    { role: "user", content: prompt }
                ],
                response_format: { type: "json_object" },
                temperature: 1.15
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

    // Fallback if no OpenAI or error
    if (!quoteData) {
        console.warn("[QuoteService] FALLBACK TO MOCK DATA (No OpenAI result)");
        const randomIndex = Math.floor(Math.random() * MOCK_QUOTES.length);
        quoteData = MOCK_QUOTES[randomIndex];
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
            sourceModel: openai ? "gpt-4o-mini" : "mock"
        }
    });

    // 4. Record View
    await prisma.dailyView.create({
        data: {
            userId,
            quoteId: quote.id,
            date: today
        }
    });

    return { ...quote, isNew: true };
}
