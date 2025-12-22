import { PrismaClient } from "@prisma/client";
import OpenAI from "openai";

const prisma = new PrismaClient();

// Initialize OpenAI - requires OPENAI_API_KEY in env
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Helper to get dates between start and end
function getDatesArray(start: Date, end: Date) {
    const arr = [];
    const dt = new Date(start);
    while (dt <= end) {
        arr.push(new Date(dt).toISOString().split("T")[0]);
        dt.setDate(dt.getDate() + 1);
    }
    return arr;
}

// AI Generator Function
async function generateAiContent(userContext: any) {
    // Randomize mode weights based on user config or defaults
    const modes = ["QUOTE", "QUOTE", "QUOTE", "QUESTION", "PULSE"];
    const mode = modes[Math.floor(Math.random() * modes.length)];

    const prompt = `Handele als 'Soul-Coach' (inspiriert von Veit Lindau).
    Format: ${mode}.
    Interessen: ${JSON.parse(userContext.preferences).interests.join(", ")}.
    
    Anweisungen:
    - QUOTE: Ein tiefes Zitat (Deutsch).
    - QUESTION: Eine radikale Frage an den Nutzer (Du-Form). Author='Reflexion'.
    - PULSE: Ein kurzer Impuls/Mantra. Author='Impuls'.
    
    Output JSON:
    { "content": "...", "author": "...", "category": "...", "concepts": [{"word": "...", "definition": "..."}] }
    `;

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            temperature: 1.1
        });
        const content = completion.choices[0].message.content;
        return content ? JSON.parse(content) : null;
    } catch (e) {
        console.error("AI Error", e);
        return null; // Fallback handled in caller
    }
}

async function main() {
    console.log("🌱 Starting Real AI Seed...");
    if (!process.env.OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY is missing in environment");
    }

    // 1. Reset DB
    console.log("Deleting old data...");
    await prisma.dailyView.deleteMany();
    await prisma.rating.deleteMany();
    await prisma.share.deleteMany();
    await prisma.quote.deleteMany();
    await prisma.user.deleteMany();

    // 2. Create Users
    console.log("Creating Users...");

    const user1 = await prisma.user.create({
        data: {
            name: "TestUser1",
            onboardingCompleted: true, // 28.10.2025 -> Today
            preferences: JSON.stringify({ interests: ["Weisheit", "Philosophie", "Stoizismus"] }),
            aiConfig: JSON.stringify({ temperature: 1.2, modeWeights: { quote: 70, question: 30, pulse: 0 } })
        }
    });

    const user2 = await prisma.user.create({
        data: {
            name: "TestUser2",
            onboardingCompleted: true, // 05.11.2025 -> Today
            preferences: JSON.stringify({ interests: ["Achtsamkeit", "Impulse", "Liebe"] }),
            aiConfig: JSON.stringify({ temperature: 0.8, modeWeights: { quote: 20, question: 20, pulse: 60 } })
        }
    });

    // 3. Populate Dates
    const today = new Date();
    const start1 = new Date("2025-10-28");
    const dates1 = getDatesArray(start1, today);

    const start2 = new Date("2025-11-05");
    const dates2 = getDatesArray(start2, today);

    console.log(`Generating ~${dates1.length + dates2.length} unique items via OpenAI. This may take a minute...`);

    // Helper to insert
    const insertDay = async (date: string, user: any) => {
        let data = await generateAiContent(user);

        // Fallback if AI fails (very rare)
        if (!data) data = { content: "Fallback Content", author: "System", category: "Error" };

        const quote = await prisma.quote.create({
            data: {
                content: data.content,
                author: data.author,
                category: data.category,
                explanation: data.explanation || "AI Generated",
                concepts: JSON.stringify(data.concepts || []),
                sourceModel: "gpt-4o-mini-seed"
            }
        });

        await prisma.dailyView.create({
            data: {
                userId: user.id,
                quoteId: quote.id,
                date: date
            }
        });

        // Random Rating
        if (Math.random() > 0.75) {
            await prisma.rating.create({
                data: {
                    userId: user.id,
                    quoteId: quote.id,
                    score: 5,
                    createdAt: new Date(date)
                }
            });
        }
    };

    // Parallel processing with limit? Or sequential to avoid rate limits? 
    // Sequential is safer for this script.

    console.log("Processing User 1...");
    for (const [i, date] of dates1.entries()) {
        process.stdout.write(`\rUser 1: ${(i / dates1.length * 100).toFixed(0)}%`);
        await insertDay(date, user1);
    }
    console.log("\nUser 1 Done.");

    console.log("Processing User 2...");
    for (const [i, date] of dates2.entries()) {
        process.stdout.write(`\rUser 2: ${(i / dates2.length * 100).toFixed(0)}%`);
        await insertDay(date, user2);
    }
    console.log("\nUser 2 Done.");

    console.log("✅ Seeding with Real AI Completed!");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
