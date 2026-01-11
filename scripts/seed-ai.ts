import { PrismaClient } from '@prisma/client';
import { getDailyQuote } from '../src/lib/ai-service';

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 STARTING AI SEED...");

    // 1. Reset Database
    console.log("💥 Resetting Database...");
    await prisma.share.deleteMany({});
    await prisma.dailyView.deleteMany({});
    await prisma.rating.deleteMany({});
    await prisma.quote.deleteMany({});
    await prisma.user.deleteMany({});

    // 2. Create Users
    console.log("👤 Creating Users...");
    const userA = await prisma.user.create({
        data: {
            name: "User A (Stoic)",
            // email removed
            preferences: JSON.stringify({ interests: ["Stoizismus", "Führung"] }),
            aiConfig: JSON.stringify({
                temperature: 1.0,
                modeWeights: { quote: 50, question: 30, pulse: 20 },
                masterPrompt: ""
            })
        }
    });

    const userB = await prisma.user.create({
        data: {
            name: "User B (Creative)",
            // email removed
            preferences: JSON.stringify({ interests: ["Kunst", "Poesie"] }),
            aiConfig: JSON.stringify({
                temperature: 1.2,
                modeWeights: { quote: 50, question: 30, pulse: 20 },
                masterPrompt: ""
            })
        }
    });

    console.log(`✅ Created Users: ${userA.id}, ${userB.id}`);

    // 3. Generate History (Last 5 Days)
    const users = [userA, userB];
    const today = new Date();

    for (const user of users) {
        console.log(`\n🤖 Generating history for ${user.name}...`);
        for (let i = 4; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            console.log(`   📅 ${dateStr} generating...`);
            try {
                const quote = await getDailyQuote(user.id, dateStr);
                console.log(`      -> [${quote.category}] ${quote.content.substring(0, 40)}...`);
            } catch (e) {
                console.error(`      ❌ Error:`, e);
            }
        }
    }

    console.log("\n✅ SEEDING COMPLETE.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
