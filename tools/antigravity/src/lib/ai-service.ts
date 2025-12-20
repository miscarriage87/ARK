import OpenAI from "openai";
import { prisma } from "./prisma";

const openai = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

// Mock data for development without API Key
const MOCK_QUOTES = [
    {
        content: "The only way to do great work is to love what you do.",
        author: "Steve Jobs",
        explanation: "Passion is the fuel for excellence.",
        category: "Motivation"
    },
    {
        content: "In the middle of difficulty lies opportunity.",
        author: "Albert Einstein",
        explanation: "Challenges often hide the best chances for growth.",
        category: "Wisdom"
    },
    {
        content: "Happiness depends upon ourselves.",
        author: "Aristotle",
        explanation: "External circumstances don't define your internal state.",
        category: "Philosophy"
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

            const prompt = `Generate a unique, inspiring quote for a user interested in: ${prefs.interests || "general wisdom"}. 
      Return JSON format: { "content": "...", "author": "...", "explanation": "2 sentences max", "category": "one word" }`;

            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "You are a wise assistant providing daily inspiration." },
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
