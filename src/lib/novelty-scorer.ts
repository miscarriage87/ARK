import type { InspirationPlan } from "./inspiration-plan";
import type { QuoteCandidate } from "./quote-output";
import { feedbackFit, type TasteProfile } from "./taste-profile";
import { countSentences, countWords, jaccardSimilarity } from "./text-metrics";

export type RecentQuoteForScoring = {
    content: string;
    headline?: string | null;
    format: string | null;
    perspective: string | null;
    tone: string | null;
    imageryWorld: string | null;
    rhetoricalDevice: string | null;
    timeHorizon: string | null;
    actionType: string | null;
    difficulty: string | null;
    category: string | null;
};

export type NoveltyScore = {
    score: number;
    semanticNovelty: number;
    maxSimilarity: number;
    readability: number;
    impact: number;
    feedbackFit: number;
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
    "deine wahrheit",
    "stell dir vor",
    "sei einfach",
    "jeder tag ist ein geschenk",
    "magie",
    "reise zu dir"
];

const HEDGING_PATTERNS = ["vielleicht", "irgendwie", "ein bisschen", "eigentlich", "ziemlich", "quasi"];

const CONCRETE_NOUNS = /\b(tisch|stuhl|fenster|tür|straße|haut|hand|hände|licht|wasser|werkzeug|labor|markt|regen|kind|geld|zeit|küche|brot|kaffee|schuhe|schlüssel|papier|stift|garten|stein|fluss|nacht|morgen|treppe|zug|schreibtisch|kalender|uhr|telefon|brief|glas|holz|feuer|salz|wind|schnee|bett|spiegel|karte|werkbank|schraube|hammer|mikroskop|zelle|stern|wolke)\b/i;

const CONTRAST_MARKERS = /\b(nicht|statt|sondern|aber|bevor|erst|trotzdem|obwohl|dennoch|dafür|weniger|mehr)\b/i;

function clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
}

function clichePenalty(content: string): { penalty: number; reasons: string[] } {
    const lower = content.toLowerCase();
    const matches = CLICHE_PATTERNS.filter((pattern) => lower.includes(pattern));

    return {
        penalty: Math.min(0.35, matches.length * 0.12),
        reasons: matches.map((match) => `cliche:${match}`)
    };
}

/**
 * Plain-language heuristic: short sentences, few long words, few nominalisations.
 * Returns 0..1 (1 = easy to grasp on first read).
 */
export function readabilityScore(content: string): { score: number; reasons: string[] } {
    const words = content.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const longWords = words.filter((word) => word.replace(/[^\p{L}]/gu, "").length >= 13).length;
    const sentences = countSentences(content);
    const commas = (content.match(/,/g) || []).length;
    const abstractNouns = words.filter((word) => /(ung|heit|keit|ismus|ität|schaft)\b/i.test(word)).length;
    const reasons: string[] = [];

    let score = 1;
    if (wordCount > 24) {
        score -= 0.25;
        reasons.push("readability:too-long");
    } else if (wordCount > 18) {
        score -= 0.1;
    }
    if (longWords > 0) {
        score -= Math.min(0.3, longWords * 0.1);
        reasons.push(`readability:long-words:${longWords}`);
    }
    if (sentences > 2) {
        score -= 0.15;
        reasons.push("readability:many-sentences");
    }
    if (commas > 2) {
        score -= 0.1;
        reasons.push("readability:comma-heavy");
    }
    if (abstractNouns > 1) {
        score -= Math.min(0.2, (abstractNouns - 1) * 0.07);
        reasons.push(`readability:abstract-nouns:${abstractNouns}`);
    }

    return { score: clamp01(Number(score.toFixed(3))), reasons };
}

/**
 * Impact heuristic: a visible turn, a concrete anchor, a clean ending, no hedging.
 * Returns 0..1. The LLM judge refines this; the heuristic only prevents obvious flatness.
 */
export function impactScore(content: string, mode: InspirationPlan["mode"]): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    const lower = content.toLowerCase();
    let score = 0;

    if (CONTRAST_MARKERS.test(content)) {
        score += 0.35;
    } else {
        reasons.push("impact:no-turn");
    }
    if (CONCRETE_NOUNS.test(content)) {
        score += 0.25;
    } else {
        reasons.push("impact:no-concrete-anchor");
    }
    if (/[.!?…»"”]$/.test(content.trim())) {
        score += 0.2;
    }
    if (!HEDGING_PATTERNS.some((pattern) => lower.includes(pattern))) {
        score += 0.2;
    } else {
        reasons.push("impact:hedging");
    }
    if (mode === "QUESTION" && !content.includes("?")) {
        score -= 0.4;
        reasons.push("impact:question-without-question-mark");
    }
    if (mode !== "QUESTION" && countWords(content) > 0 && content.includes("?")) {
        score -= 0.15;
    }

    return { score: clamp01(Number(score.toFixed(3))), reasons };
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

function lengthBonus(candidate: QuoteCandidate): number {
    const length = candidate.content.length;
    return length >= 60 && length <= 150 ? 0.06 : 0;
}

function headlineRepeatPenalty(candidate: QuoteCandidate, recentQuotes: RecentQuoteForScoring[]): { penalty: number; reasons: string[] } {
    const headline = candidate.headline?.trim().toLowerCase();
    if (!headline) return { penalty: 0, reasons: [] };

    const repeated = recentQuotes.some((quote) => quote.headline?.trim().toLowerCase() === headline);
    return repeated
        ? { penalty: 0.15, reasons: ["repeated-headline"] }
        : { penalty: 0, reasons: [] };
}

export function scoreQuoteCandidate(input: {
    candidate: QuoteCandidate;
    plan: InspirationPlan;
    recentQuotes: RecentQuoteForScoring[];
    profile?: TasteProfile | null;
}): NoveltyScore {
    const similarities = input.recentQuotes
        .slice(0, 30)
        .map((quote) => jaccardSimilarity(input.candidate.content, quote.content));
    const maxSimilarity = similarities.length ? Math.max(...similarities) : 0;
    const semanticNovelty = 1 - maxSimilarity;
    const cliche = clichePenalty(input.candidate.content);
    const axis = axisPenalty(input.candidate, input.recentQuotes, input.plan);
    const readability = readabilityScore(input.candidate.content);
    const impact = impactScore(input.candidate.content, input.plan.mode);
    const headline = headlineRepeatPenalty(input.candidate, input.recentQuotes);
    const fit = feedbackFit(input.profile ?? null, {
        content: input.candidate.content,
        mode: input.plan.mode,
        category: input.candidate.category || input.plan.category,
        format: input.candidate.format || input.plan.format,
        tone: input.candidate.tone || input.plan.tone,
        imageryWorld: input.candidate.imageryWorld || input.plan.imageryWorld,
        rhetoricalDevice: input.candidate.rhetoricalDevice || input.plan.rhetoricalDevice,
        perspective: input.plan.perspective,
        timeHorizon: input.plan.timeHorizon,
        actionType: input.plan.actionType,
        difficulty: input.plan.difficulty
    });

    const rawScore = 0.42
        + semanticNovelty * 0.25
        + readability.score * 0.12
        + impact.score * 0.08
        + fit.fit * 0.10
        + lengthBonus(input.candidate)
        - cliche.penalty
        - axis.penalty
        - headline.penalty;

    return {
        score: clamp01(Number(rawScore.toFixed(4))),
        semanticNovelty: Number(semanticNovelty.toFixed(4)),
        maxSimilarity: Number(maxSimilarity.toFixed(4)),
        readability: readability.score,
        impact: impact.score,
        feedbackFit: fit.fit,
        reasons: [
            `semantic-novelty:${semanticNovelty.toFixed(2)}`,
            `readability:${readability.score.toFixed(2)}`,
            `impact:${impact.score.toFixed(2)}`,
            ...(fit.fit !== 0 ? [`feedback-fit:${fit.fit.toFixed(2)}`] : []),
            ...cliche.reasons,
            ...axis.reasons,
            ...headline.reasons,
            ...readability.reasons,
            ...impact.reasons,
            ...fit.reasons
        ]
    };
}
