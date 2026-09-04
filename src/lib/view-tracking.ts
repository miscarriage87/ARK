import { prisma } from "./prisma";

/**
 * Engagement tracking for calendar leaves.
 *
 * DailyView rows are created when a quote is generated, which often happens
 * during pregeneration (cron / background). These helpers record whether the
 * user really opened the leaf in the app and whether it was torn off.
 */

export async function markDailyViewOpened(userId: string, date: string): Promise<void> {
    const now = new Date();

    await prisma.dailyView.updateMany({
        where: { userId, date },
        data: { openCount: { increment: 1 } }
    });

    await prisma.dailyView.updateMany({
        where: { userId, date, firstOpenedAt: null },
        data: { firstOpenedAt: now }
    });
}

export async function markDailyViewRevealed(userId: string, quoteId: number): Promise<boolean> {
    const result = await prisma.dailyView.updateMany({
        where: { userId, quoteId, revealedAt: null },
        data: { revealedAt: new Date() }
    });

    return result.count > 0;
}
