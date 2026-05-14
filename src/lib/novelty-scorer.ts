import type { InspirationPlan } from "./inspiration-plan";
import type { QuoteCandidate } from "./quote-output";

export type RecentQuoteForScoring = {
    content: string;
    format: string | null;
    tone: string | null;
    imageryWorld: string | null;
    rhetoricalDevice: string | null;
    category: string | null;
};

export type NoveltyScore = {
    score: number;
    semanticNovelty: number;
    maxSimilarity: number;
    reasons: string[];
};

const CLICHE_PATTERNS = [
    "was hält dich",
    "fühle",
    "in der stille",
    "tauch ein",
    "lass los",
    "hier und jetzt",
    "atme",
    "atem",
    "universum",
    "alles ist energie",
    "deine wahrheit"
];

function normalizeWords(text: string): Set<string> {
    return new Set(
        text
            .toLowerCase()
            .normalize("NFKD")
            .replace(/[^\p{L}\p{N}\s-]/gu, " ")
            .split(/\s+/)
            .filter((word) => word.length > 3)
    );
}

function jaccardSimilarity(a: string, b: string): number {
    const aWords = normalizeWords(a);
    const bWords = normalizeWords(b);

    if (aWords.size === 0 || bWords.size === 0) return 0;

    let intersection = 0;
    for (const word of aWords) {
        if (bWords.has(word)) intersection++;
    }

    const union = new Set([...aWords, ...bWords]).size;
    return union === 0 ? 0 : intersection / union;
}

function clichePenalty(content: string): { penalty: number; reasons: string[] } {
    const lower = content.toLowerCase();
    const matches = CLICHE_PATTERNS.filter((pattern) => lower.includes(pattern));

    return {
        penalty: Math.min(0.35, matches.length * 0.12),
        reasons: matches.map((match) => `cliche:${match}`)
    };
}

function axisPenalty(
    candidate: QuoteCandidate,
    recentQuotes: RecentQuoteForScoring[],
    plan: InspirationPlan
): { penalty: number; reasons: string[] } {
    const recent = recentQuotes.slice(0, 7);
    const axisChecks: Array<[string, string, (quote: RecentQuoteForScoring) => string | null]> = [
        ["format", candidate.format || plan.format, (quote) => quote.format],
        ["tone", candidate.tone || plan.tone, (quote) => quote.tone],
        ["imagery", candidate.imageryWorld || plan.imageryWorld, (quote) => quote.imageryWorld],
        ["device", candidate.rhetoricalDevice || plan.rhetoricalDevice, (quote) => quote.rhetoricalDevice],
        ["category", candidate.category || plan.category, (quote) => quote.category]
    ];

    let penalty = 0;
    const reasons: string[] = [];

    for (const [label, value, read] of axisChecks) {
        if (!value) continue;
        const repeats = recent.filter((quote) => read(quote) === value).length;
        if (repeats > 0) {
            penalty += Math.min(0.12, repeats * 0.03);
            reasons.push(`recent-${label}:${value}`);
        }
    }

    return { penalty, reasons };
}

function qualityBonus(candidate: QuoteCandidate): number {
    const length = candidate.content.length;
    const hasConcreteNoun = /\b(tisch|fenster|straße|haut|licht|wasser|werkzeug|labor|markt|regen|kind|geld|zeit)\b/i.test(candidate.content);
    const lengthScore = length >= 60 && length <= 160 ? 0.08 : 0;
    const concreteScore = hasConcreteNoun ? 0.05 : 0;

    return lengthScore + concreteScore;
}

export function scoreQuoteCandidate(input: {
    candidate: QuoteCandidate;
    plan: InspirationPlan;
    recentQuotes: RecentQuoteForScoring[];
}): NoveltyScore {
    const similarities = input.recentQuotes
        .slice(0, 30)
        .map((quote) => jaccardSimilarity(input.candidate.content, quote.content));
    const maxSimilarity = similarities.length ? Math.max(...similarities) : 0;
    const semanticNovelty = 1 - maxSimilarity;
    const cliche = clichePenalty(input.candidate.content);
    const axis = axisPenalty(input.candidate, input.recentQuotes, input.plan);

    const rawScore = 0.62
        + semanticNovelty * 0.3
        + qualityBonus(input.candidate)
        - cliche.penalty
        - axis.penalty;

    return {
        score: Math.max(0, Math.min(1, Number(rawScore.toFixed(4)))),
        semanticNovelty: Number(semanticNovelty.toFixed(4)),
        maxSimilarity: Number(maxSimilarity.toFixed(4)),
        reasons: [
            `semantic-novelty:${semanticNovelty.toFixed(2)}`,
            ...cliche.reasons,
            ...axis.reasons
        ]
    };
}
