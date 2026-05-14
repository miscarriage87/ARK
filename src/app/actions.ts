"use server";

import { getDailyQuote } from "@/lib/ai-service";
import { formatAppDate } from "@/lib/utils";

export async function fetchDailyQuoteAction(userId: string) {
    try {
        const quote = await getDailyQuote(userId);
        return { success: true, quote, date: formatAppDate() };
    } catch (error) {
        console.error("Failed to generate quote:", error);
        return { success: false, error: "Failed to load content." };
    }
}
