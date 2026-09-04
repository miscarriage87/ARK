"use server";

import { cookies } from "next/headers";
import { getDailyQuote } from "@/lib/ai-service";
import { markDailyViewOpened, markDailyViewRevealed } from "@/lib/view-tracking";
import { formatAppDate, isValidUUID, logger } from "@/lib/utils";

const USER_COOKIE = "ark_user_id";

/**
 * Makes sure the browser carries the session cookie for the user it is viewing.
 * Users who open their page on a new device (no onboarding POST) otherwise
 * cannot trigger pregeneration or rate leaves.
 */
async function ensureUserCookie(userId: string): Promise<void> {
    const store = await cookies();
    if (store.get(USER_COOKIE)?.value === userId) return;

    store.set(USER_COOKIE, userId, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "strict"
    });
}

export async function fetchDailyQuoteAction(userId: string) {
    if (!isValidUUID(userId)) {
        return { success: false as const, error: "Invalid user." };
    }

    try {
        const date = formatAppDate();
        const quote = await getDailyQuote(userId, date);

        // The leaf is rendered right after this call: count it as a real view.
        await Promise.all([markDailyViewOpened(userId, date), ensureUserCookie(userId)]);

        return { success: true as const, quote, date };
    } catch (error) {
        logger.error("[Actions] Failed to load daily quote:", error);
        return { success: false as const, error: "Failed to load content." };
    }
}

/** Called when the user tears off today's leaf: the strongest "actually looked at it" signal. */
export async function revealDailyQuoteAction(userId: string, quoteId: number) {
    if (!isValidUUID(userId) || !Number.isInteger(quoteId) || quoteId <= 0) {
        return { success: false as const };
    }

    try {
        const updated = await markDailyViewRevealed(userId, quoteId);
        return { success: true as const, updated };
    } catch (error) {
        logger.warn("[Actions] Failed to mark leaf as revealed:", error);
        return { success: false as const };
    }
}
