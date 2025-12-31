
import { prisma } from "./prisma";

export class HistoryCompressor {
    /**
     * Generates a compressed "Blocklist" string for the AI.
     * Format: "A:{Author1,Author2}|C:{Concept1,Concept2}"
     * 
     * Strategy:
     * - Authors: Last 40 unique authors (Recent repetition is bad)
     * - Concepts: Top 20 most frequent (Boredom filter) AND Last 10 used (Freshness filter)
     */
    static async calculateUserHistoryCode(userId: string, protectedTerms: string[] = []): Promise<{ authorsString: string, conceptsString: string, fullCode: string }> {
        // 1. Fetch EVERYTHING (ID, Author, Concepts) - Efficient select
        const history = await prisma.dailyView.findMany({
            where: { userId },
            orderBy: { date: 'desc' },
            include: {
                quote: {
                    select: {
                        author: true,
                        concepts: true,
                        category: true
                    }
                }
            }
        });

        if (history.length === 0) return { authorsString: "", conceptsString: "", fullCode: "" };

        // 2. Aggregate Data
        const seenAuthors = new Set<string>();
        const conceptCounts: Record<string, number> = {};
        const recentConcepts: string[] = [];

        // We only care about the last X entries for the "Freshness" filters,
        // but we scan the whole history for "Frequency" stats.

        history.forEach((view, index) => {
            const q = view.quote;

            // Authors: Just keep adding to the Set. 
            // Since we iterate from newest to oldest, the Set naturally prioritizes recent ones found first? 
            // No, Set doesn't care. But we want the "Last 40 UNIQUE authors".
            if (q.author && q.author !== "Unbekannt" && q.author !== "Reflexion" && q.author !== "Impuls") {
                seenAuthors.add(q.author);
            }

            // Concepts
            if (q.concepts) {
                try {
                    const parsed = JSON.parse(q.concepts);
                    if (Array.isArray(parsed)) {
                        parsed.forEach((c: any) => {
                            if (c.word) {
                                const word = c.word.trim();
                                conceptCounts[word] = (conceptCounts[word] || 0) + 1;

                                // Keep track of VERY recent concepts (last 10 entries)
                                if (index < 10) {
                                    recentConcepts.push(word);
                                }
                            }
                        });
                    }
                } catch (e) {
                    // Ignore bad JSON
                }
            }
        });

        // 3. Select Tokens for the Blocklist

        // Authors: Take the first 40 from the Set (which are effectively random from the user's perspective, 
        // but if we want "Last 40 used", we should have collected them in a list and then distinct-ified.
        // Let's refine: The query is ordered by date DESC. So history[0] is today.
        // We want to block the AUTHORS that were seen MOST RECENTLY.
        const authorList: string[] = [];
        const authorSet = new Set<string>();

        for (const h of history) {
            const a = h.quote.author;
            if (a && a !== "Unbekannt" && !authorSet.has(a) && a !== "Reflexion" && a !== "Impuls") {
                authorSet.add(a);
                authorList.push(a);
            }
            if (authorList.length >= 40) break;
        }

        // Concepts:
        // A) Top Frequent (The phrases the user sees ALL THE TIME)
        // Normalize protected terms
        const normalizedProtected = new Set(protectedTerms.map(t => t.toLowerCase().trim()));

        const sortedConcepts = Object.entries(conceptCounts)
            .sort(([, a], [, b]) => b - a) // Descending count
            .slice(0, 20)
            .map(([word]) => word);

        // B) Recently Used (The phrases from the last few days)
        // Merge and Deduplicate
        const mergedConcepts = Array.from(new Set([...sortedConcepts, ...recentConcepts]))
            .filter(word => !normalizedProtected.has(word.toLowerCase().trim()));

        // 4. Construct Code
        // "A:{Jobs,Einstein}|C:{Erfolg,Geld}"

        // Sanitize: Remove commas from values to not break our simulated CSV format
        const cleanA = authorList.map(s => s.replace(/,/g, '')).join(",");
        const cleanC = mergedConcepts.map(s => s.replace(/,/g, '')).join(",");

        const fullCode = `A:{${cleanA}}|C:{${cleanC}}`;
        return {
            authorsString: cleanA,
            conceptsString: cleanC,
            fullCode: fullCode
        };
    }
}
