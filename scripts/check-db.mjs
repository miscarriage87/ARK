// Quick database connectivity check: `npm run db:check`
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
    const [users, quotes, views, ratings] = await Promise.all([
        prisma.user.count(),
        prisma.quote.count(),
        prisma.dailyView.count(),
        prisma.rating.count()
    ]);
    console.log(JSON.stringify({ ok: true, users, quotes, views, ratings }, null, 2));
} catch (error) {
    console.error("Database check failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
} finally {
    await prisma.$disconnect();
}
