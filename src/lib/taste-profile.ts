import { jaccardSimilarity } from "./text-metrics";
import { safeJsonParse } from "./utils";

/**
 * Taste profile: what a user rated as "gut" (thumbs up) or "schlecht" (thumbs down),
 * aggregated per variety axis and summarized by an LLM into short writing guidance.
 *
 * The profile steers planning, prompting and scoring of future calendar leaves.
 * It is a compass, not a template: variety rules still apply on top of it.
 */

export const TASTE_PROFILE_VERSION = 1;
export const MIN_RATINGS_FOR_SUMMARY = 3;

export const TASTE_AXES = [
    "mode",
    "category",
    "format",
    "tone",
    "imageryWorld",
    "rhetoricalDevice",
    "perspective",
    "timeHorizon",
    "actionType",
    "difficulty",
    "length"
] as const;

export type TasteAxis = (typeof TASTE_AXES)[number];
export type RatingVerdict = "up" | "down";

export type RatedQuoteSignal = {
    verdict: RatingVerdict;
    content: string;
    headline?: string | null;
    mode?: string | null;
    category?: string | null;
    format?: string | null;
    tone?: string | null;
    imageryWorld?: string | null;
    rhetoricalDevice?: string | null;
    perspective?: string | null;
    timeHorizon?: string | null;
    actionType?: string | null;
    difficulty?: string | null;
};

export type AxisPreference = {
    value: string;
    /** -1 (always disliked) .. +1 (always liked), smoothed for low counts */
    score: number;
    up: number;
    down: number;
};

export type AxisPreferences = Partial<Record<TasteAxis, AxisPreference[]>>;

export type TasteProfileSummary = {
    summary: string;
    guidance: string;
    preferPatterns: string[];
    avoidPatterns: string[];
    model: string;
};

export type TasteProfile = {
    version: number;
    updatedAt: string;
    ratingsCount: number;
    upCount: number;
    downCount: number;
    axes: AxisPreferences;
    likedExamples: string[];
    dislikedExamples: string[];
    summary: TasteProfileSummary | null;
};

/** Axis -> value -> preference score, consumed by the inspiration planner. */
export type PlanPreferences = Partial<Record<TasteAxis, Record<string, number>>>;

export const AXIS_LABELS: Record<TasteAxis, string> = {
    mode: "Format-Typ",
    category: "Kategorie",
    format: "Form",
    tone: "Ton",
    imageryWorld: "Bildwelt",
    rhetoricalDevice: "Stilmittel",
    perspective: "Perspektive",
    timeHorizon: "Zeithorizont",
    actionType: "Handlungstyp",
    difficulty: "Schwierigkeit",
    length: "Länge"
};

export function verdictFromScore(score: number): RatingVerdict {
    return score >= 4 ? "up" : "down";
}

export function scoreFromVerdict(verdict: RatingVerdict): number {
    return verdict === "up" ? 5 : 1;
}

export function lengthBucket(content: string): "kurz" | "mittel" | "lang" {
    const length = content.trim().length;
    if (length <= 80) return "kurz";
    if (length <= 130) return "mittel";
    return "lang";
}

export function signalAxisValues(signal: Omit<RatedQuoteSignal, "verdict">): Partial<Record<TasteAxis, string>> {
    const values: Partial<Record<TasteAxis, string>> = {};
    const pairs: Array<[TasteAxis, string | null | undefined]> = [
        ["mode", signal.mode],
        ["category", signal.category],
        ["format", signal.format],
        ["tone", signal.tone],
        ["imageryWorld", signal.imageryWorld],
        ["rhetoricalDevice", signal.rhetoricalDevice],
        ["perspective", signal.perspective],
        ["timeHorizon", signal.timeHorizon],
        ["actionType", signal.actionType],
        ["difficulty", signal.difficulty],
        ["length", signal.content ? lengthBucket(signal.content) : null]
    ];

    for (const [axis, value] of pairs) {
        if (typeof value === "string" && value.trim().length > 0) {
            values[axis] = value.trim();
        }
    }

    return values;
}

export function computeAxisPreferences(signals: RatedQuoteSignal[]): AxisPreferences {
    const counts: Partial<Record<TasteAxis, Map<string, { up: number; down: number }>>> = {};

    for (const signal of signals) {
        const values = signalAxisValues(signal);
        for (const axis of TASTE_AXES) {
            const value = values[axis];
            if (!value) continue;

            const bucket = counts[axis] ?? new Map<string, { up: number; down: number }>();
            const entry = bucket.get(value) ?? { up: 0, down: 0 };
            if (signal.verdict === "up") entry.up += 1;
            else entry.down += 1;
            bucket.set(value, entry);
            counts[axis] = bucket;
        }
    }

    const preferences: AxisPreferences = {};
    for (const axis of TASTE_AXES) {
        const bucket = counts[axis];
        if (!bucket) continue;

        preferences[axis] = [...bucket.entries()]
            .map(([value, { up, down }]) => ({
                value,
                up,
                down,
                // Laplace-style smoothing: one rating never dominates.
                score: Number(((up - down) / (up + down + 1)).toFixed(3))
            }))
            .sort((a, b) => Math.abs(b.score) - Math.abs(a.score) || (b.up + b.down) - (a.up + a.down));
    }

    return preferences;
}

function exampleText(signal: RatedQuoteSignal): string {
    const headline = signal.headline?.trim();
    const content = signal.content.trim().slice(0, 160);
    return headline ? `${headline}: ${content}` : content;
}

export function buildTasteProfile(
    signals: RatedQuoteSignal[],
    summary: TasteProfileSummary | null = null,
    now: Date = new Date()
): TasteProfile {
    const upCount = signals.filter((signal) => signal.verdict === "up").length;
    const downCount = signals.length - upCount;

    return {
        version: TASTE_PROFILE_VERSION,
        updatedAt: now.toISOString(),
        ratingsCount: signals.length,
        upCount,
        downCount,
        axes: computeAxisPreferences(signals),
        likedExamples: signals.filter((signal) => signal.verdict === "up").slice(0, 8).map(exampleText),
        dislikedExamples: signals.filter((signal) => signal.verdict === "down").slice(0, 6).map(exampleText),
        summary
    };
}

export function parseTasteProfile(raw: string | null | undefined): TasteProfile | null {
    const parsed = safeJsonParse<Partial<TasteProfile> | null>(raw, null);
    if (!parsed || typeof parsed !== "object" || parsed.version !== TASTE_PROFILE_VERSION) return null;
    if (typeof parsed.ratingsCount !== "number" || !parsed.axes || typeof parsed.axes !== "object") return null;

    return {
        version: TASTE_PROFILE_VERSION,
        updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date(0).toISOString(),
        ratingsCount: parsed.ratingsCount,
        upCount: typeof parsed.upCount === "number" ? parsed.upCount : 0,
        downCount: typeof parsed.downCount === "number" ? parsed.downCount : 0,
        axes: parsed.axes,
        likedExamples: Array.isArray(parsed.likedExamples) ? parsed.likedExamples.filter((item) => typeof item === "string") : [],
        dislikedExamples: Array.isArray(parsed.dislikedExamples) ? parsed.dislikedExamples.filter((item) => typeof item === "string") : [],
        summary: parsed.summary && typeof parsed.summary === "object" && typeof parsed.summary.summary === "string"
            ? {
                summary: parsed.summary.summary,
                guidance: typeof parsed.summary.guidance === "string" ? parsed.summary.guidance : "",
                preferPatterns: Array.isArray(parsed.summary.preferPatterns) ? parsed.summary.preferPatterns : [],
                avoidPatterns: Array.isArray(parsed.summary.avoidPatterns) ? parsed.summary.avoidPatterns : [],
                model: typeof parsed.summary.model === "string" ? parsed.summary.model : "unknown"
            }
            : null
    };
}

/** Confidence-weighted preference score for an axis value (0 when unknown). */
export function preferenceScore(profile: TasteProfile | null, axis: TasteAxis, value: string | null | undefined): number {
    if (!profile || !value) return 0;
    const entry = profile.axes[axis]?.find((item) => item.value === value);
    if (!entry) return 0;

    const total = entry.up + entry.down;
    const confidence = total / (total + 2);
    return Number((entry.score * confidence).toFixed(3));
}

export function planPreferencesFromProfile(profile: TasteProfile | null): PlanPreferences {
    if (!profile) return {};

    const preferences: PlanPreferences = {};
    for (const axis of TASTE_AXES) {
        const entries = profile.axes[axis];
        if (!entries || entries.length === 0) continue;

        preferences[axis] = Object.fromEntries(
            entries.map((entry) => [entry.value, preferenceScore(profile, axis, entry.value)])
        );
    }

    return preferences;
}

export type StrongPreference = AxisPreference & { axis: TasteAxis };

export function strongestPreferences(
    profile: TasteProfile | null,
    direction: RatingVerdict,
    limit = 5,
    minAbsScore = 0.3
): StrongPreference[] {
    if (!profile) return [];

    const items: StrongPreference[] = [];
    for (const axis of TASTE_AXES) {
        for (const entry of profile.axes[axis] ?? []) {
            const weighted = preferenceScore(profile, axis, entry.value);
            if (direction === "up" && weighted >= minAbsScore) items.push({ ...entry, axis, score: weighted });
            if (direction === "down" && weighted <= -minAbsScore) items.push({ ...entry, axis, score: weighted });
        }
    }

    return items
        .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
        .slice(0, limit);
}

export type FeedbackFit = {
    /** -1 .. +1 */
    fit: number;
    reasons: string[];
};

export function feedbackFit(
    profile: TasteProfile | null,
    candidate: { content: string } & Partial<Record<Exclude<TasteAxis, "length">, string | null | undefined>>
): FeedbackFit {
    if (!profile || profile.ratingsCount === 0) {
        return { fit: 0, reasons: [] };
    }

    const reasons: string[] = [];
    const values = signalAxisValues(candidate);
    let weighted = 0;
    let weightSum = 0;

    for (const axis of TASTE_AXES) {
        const value = values[axis];
        if (!value) continue;
        const score = preferenceScore(profile, axis, value);
        if (score === 0) continue;

        weighted += score;
        weightSum += 1;
        if (Math.abs(score) >= 0.3) {
            reasons.push(`${score > 0 ? "liked" : "disliked"}-${axis}:${value}`);
        }
    }

    let fit = weightSum > 0 ? weighted / weightSum : 0;

    const closestDislike = profile.dislikedExamples
        .map((example) => jaccardSimilarity(candidate.content, example))
        .reduce((max, value) => Math.max(max, value), 0);
    if (closestDislike >= 0.3) {
        fit -= 0.5;
        reasons.push(`similar-to-disliked:${closestDislike.toFixed(2)}`);
    }

    return {
        fit: Number(Math.max(-1, Math.min(1, fit)).toFixed(3)),
        reasons
    };
}

function formatPreferenceList(items: StrongPreference[]): string {
    return items
        .map((item) => `${AXIS_LABELS[item.axis]}=${item.value} (${item.up}👍/${item.down}👎)`)
        .join(", ");
}

/** German prompt block describing the user's taste for the generation and judge prompts. */
export function tasteProfilePromptBlock(profile: TasteProfile | null): string {
    if (!profile || profile.ratingsCount === 0) {
        return [
            "NUTZERPROFIL:",
            "- Noch keine Bewertungen. Orientiere dich an den Interessen und bleibe abwechslungsreich."
        ].join("\n");
    }

    const liked = strongestPreferences(profile, "up", 5);
    const disliked = strongestPreferences(profile, "down", 5);
    const ratingsWord = profile.ratingsCount === 1 ? "Bewertung" : "Bewertungen";
    const lines = [
        `NUTZERPROFIL (aus ${profile.ratingsCount} ${ratingsWord} gelernt: ${profile.upCount} gut, ${profile.downCount} schlecht):`
    ];

    if (profile.summary?.summary) {
        lines.push(`- Geschmack: ${profile.summary.summary}`);
    }
    if (profile.summary?.guidance) {
        lines.push(`- Schreibregeln aus dem Profil: ${profile.summary.guidance}`);
    }
    if (profile.summary?.preferPatterns?.length) {
        lines.push(`- Kommt gut an: ${profile.summary.preferPatterns.join("; ")}`);
    }
    if (profile.summary?.avoidPatterns?.length) {
        lines.push(`- Kommt nicht an: ${profile.summary.avoidPatterns.join("; ")}`);
    }
    if (liked.length > 0) {
        lines.push(`- Bevorzugte Achsen: ${formatPreferenceList(liked)}`);
    }
    if (disliked.length > 0) {
        lines.push(`- Eher meiden: ${formatPreferenceList(disliked)}`);
    }
    if (profile.likedExamples.length > 0) {
        lines.push(`- Beispiele, die gut ankamen: ${profile.likedExamples.slice(0, 3).map((item) => `"${item}"`).join(" | ")}`);
    }
    if (profile.dislikedExamples.length > 0) {
        lines.push(`- Beispiele, die nicht ankamen: ${profile.dislikedExamples.slice(0, 2).map((item) => `"${item}"`).join(" | ")}`);
    }

    lines.push("- Nutze das Profil als Kompass, nicht als Schablone: bleib abwechslungsreich und wiederhole keine Beispiele.");
    return lines.join("\n");
}
