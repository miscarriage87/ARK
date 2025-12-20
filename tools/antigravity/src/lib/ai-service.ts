import OpenAI from "openai";
import { prisma } from "./prisma";

const openai = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

// Mock data for development without API Key
const MOCK_QUOTES = [
    {
        content: "Der einzige Weg, großartige Arbeit zu leisten, ist zu lieben, was man tut.",
        author: "Steve Jobs",
        explanation: "Leidenschaft ist der Treibstoff für Exzellenz.",
        category: "Motivation"
    },
    {
        content: "In der Mitte der Schwierigkeit liegt die Gelegenheit.",
        author: "Albert Einstein",
        explanation: "Herausforderungen verbergen oft die besten Chancen für Wachstum.",
        category: "Weisheit"
    },
    {
        content: "Das Glück hängt von uns selbst ab.",
        author: "Aristoteles",
        explanation: "Äußere Umstände definieren nicht deinen inneren Zustand.",
        category: "Philosophie"
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
        return {
            ...history.quote,
            isNew: false
        };
    }

    // 2. Generate or Fetch new quote
    let quoteData;

    if (openai) {
        try {
            // Get User Preferences
            const user = await prisma.user.findUnique({ where: { id: userId } });
            const prefs = user?.preferences ? JSON.parse(user.preferences) : {};

            const prompt = `Generiere ein einzigartiges, inspirierendes Zitat für einen Nutzer mit Interesse an: ${prefs.interests || "allgemeiner Weisheit"}. 
      Antworte im JSON Format: { "content": "Zitat auf Deutsch", "author": "Name", "explanation": "Maximal 2 Sätze Erklärung auf Deutsch", "category": "Ein Wort (Kategorie)" }`;

            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "Du bist ein weiser Assistent, der tägliche Inspiration liefert." },
                    { role: "user", content: prompt }
                ],
                response_format: { type: "json_object" }
            });

            const content = completion.choices[0].message.content;
            if (content) {
                quoteData = JSON.parse(content);
            }
        } catch (error) {
            console.error("OpenAI Error:", error);
            // Fallback to mock
        }
    }

    // Fallback if no OpenAI or error
    if (!quoteData) {
        const randomIndex = Math.floor(Math.random() * MOCK_QUOTES.length);
        quoteData = MOCK_QUOTES[randomIndex];
    }

    // 3. Save to DB
    // Create Quote if not exists (deduplication logic skipped for simplicity, just create new for now)
    const quote = await prisma.quote.create({
        data: {
            content: quoteData.content,
            author: quoteData.author,
            explanation: quoteData.explanation,
            category: quoteData.category,
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
