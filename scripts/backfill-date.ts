/**
 * Generates (or returns the cached) calendar leaf for one user and date.
 *
 * Usage: npx tsx scripts/backfill-date.ts <userId> [YYYY-MM-DD]
 */
import { getDailyQuote } from "../src/lib/ai-service";
import { formatAppDate, isValidUUID } from "../src/lib/utils";

const [userId, dateArg] = process.argv.slice(2);
const date = dateArg || formatAppDate();

if (!userId || !isValidUUID(userId)) {
    console.error("Usage: npx tsx scripts/backfill-date.ts <userId> [YYYY-MM-DD]");
    process.exit(1);
}

if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    console.error(`Invalid date: ${date} (expected YYYY-MM-DD)`);
    process.exit(1);
}

console.log(`Generating quote for userId=${userId}, date=${date}`);

getDailyQuote(userId, date)
    .then((result) => {
        console.log("Success:", {
            id: result.id,
            headline: result.headline,
            content: result.content,
            microAction: result.microAction,
            sourceModel: result.sourceModel,
            isNew: result.isNew
        });
        process.exit(0);
    })
    .catch((err) => {
        console.error("Error:", err);
        process.exit(1);
    });
