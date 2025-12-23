// check-db.mjs
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("--- Users ---");
    const users = await prisma.user.findMany();
    console.table(users);

    console.log("\n--- Daily Views ---");
    const views = await prisma.dailyView.findMany();
    console.table(views);

    console.log("\n--- Ratings (Likes) ---");
    const ratings = await prisma.rating.findMany();
    console.table(ratings);

    console.log("\n--- Quotes ---");
    const quotes = await prisma.quote.findMany({ take: 5 });
    console.table(quotes.map(q => ({ id: q.id, content: q.content.substring(0, 30) + "..." })));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
