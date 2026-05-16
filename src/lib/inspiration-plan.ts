import { createHash } from "crypto";
import { FALLBACK_INTERESTS, type AIMode } from "./constants";

export type ModeWeights = {
    quote: number;
    question: number;
    pulse: number;
};

export type InspirationPlan = {
    seed: string;
    mode: AIMode;
    category: string;
    format: string;
    perspective: string;
    tone: string;
    imageryWorld: string;
    rhetoricalDevice: string;
    timeHorizon: string;
    actionType: string;
    difficulty: string;
    lane: string;
};

export type RecentInspirationSignal = Partial<InspirationPlan>;

export const VARIETY_AXES = {
    formats: [
        "aphorism",
        "micro-story",
        "field-note",
        "decision-rule",
        "small-experiment",
        "contrarian-lens",
        "conversation-prompt",
        "art-assignment",
        "scientific-wonder",
        "body-cue",
        "definition",
        "threshold-question"
    ],
    perspectives: [
        "second-person direct",
        "future self",
        "outsider view",
        "childlike view",
        "historical lens",
        "first-person observation",
        "third-person scene"
    ],
    tones: [
        "crisp",
        "poetic",
        "analytical",
        "tender",
        "provocative",
        "playful",
        "quiet",
        "precise",
        "ceremonial"
    ],
    imageryWorlds: [
        "nature detail",
        "city",
        "workshop",
        "laboratory",
        "kitchen",
        "market",
        "body",
        "machine",
        "childhood",
        "weather",
        "night",
        "threshold"
    ],
    rhetoricalDevices: [
        "analogy",
        "contrast",
        "reversal",
        "imperative",
        "compressed story",
        "sensory anchor",
        "if-then rule",
        "definition",
        "contradiction"
    ],
    timeHorizons: [
        "this morning",
        "this hour",
        "today",
        "this week",
        "ten years",
        "childhood",
        "end-of-life reflection"
    ],
    actionTypes: [
        "observe",
        "ask",
        "decide",
        "remove",
        "repair",
        "thank",
        "test",
        "move",
        "write",
        "speak"
    ],
    difficulties: [
        "gentle",
        "moderate",
        "uncomfortable"
    ],
    lanes: [
        "clarity",
        "sensory",
        "contrarian",
        "practical"
    ]
} as const;

type Rng = () => number;

function hashToInt(input: string): number {
    return createHash("sha256").update(input).digest().readUInt32LE(0);
}

function createRng(seed: string): Rng {
    let value = hashToInt(seed);

    return () => {
        value += 0x6D2B79F5;
        let t = value;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function chooseWeightedMode(weights: ModeWeights, rng: Rng): AIMode {
    const entries: Array<[AIMode, number]> = [
        ["QUOTE", Math.max(0, weights.quote || 0)],
        ["QUESTION", Math.max(0, weights.question || 0)],
        ["PULSE", Math.max(0, weights.pulse || 0)]
    ];
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0);

    if (total <= 0) return "QUOTE";

    let cursor = rng() * total;
    for (const [mode, weight] of entries) {
        cursor -= weight;
        if (cursor <= 0) return mode;
    }

    return "QUOTE";
}

function countRecentMatches(
    recentSignals: RecentInspirationSignal[],
    key: keyof InspirationPlan,
    value: string
): number {
    return recentSignals.slice(0, 14).reduce((count, signal, index) => {
        if (signal[key] !== value) return count;
        return count + Math.max(1, 14 - index);
    }, 0);
}

function pickLeastRecent(
    values: readonly string[],
    recentSignals: RecentInspirationSignal[],
    key: keyof InspirationPlan,
    rng: Rng
): string {
    const ranked = values
        .map((value) => ({
            value,
            penalty: countRecentMatches(recentSignals, key, value),
            tieBreaker: rng()
        }))
        .sort((a, b) => a.penalty - b.penalty || a.tieBreaker - b.tieBreaker);

    return ranked[0]?.value || values[0] || "";
}

function withModeAlignedFormat(mode: AIMode, format: string): string {
    if (mode === "QUESTION" && !["threshold-question", "conversation-prompt", "contrarian-lens"].includes(format)) {
        return "threshold-question";
    }

    if (mode === "PULSE" && !["small-experiment", "body-cue", "decision-rule"].includes(format)) {
        return "small-experiment";
    }

    return format;
}

function indexIn(values: readonly string[], value: string): number {
    const index = values.findIndex((item) => item === value);
    return index >= 0 ? index : 0;
}

export function buildInspirationPlan(input: {
    userId: string;
    date: string;
    interests: string[];
    modeWeights: ModeWeights;
    recentSignals?: RecentInspirationSignal[];
}): InspirationPlan {
    const seed = `${input.userId}:${input.date}:ark-variety-v1`;
    const rng = createRng(seed);
    const recentSignals = input.recentSignals || [];
    const interests = input.interests.length > 0 ? input.interests : [...FALLBACK_INTERESTS];

    const mode = chooseWeightedMode(input.modeWeights, rng);
    const format = withModeAlignedFormat(
        mode,
        pickLeastRecent(VARIETY_AXES.formats, recentSignals, "format", rng)
    );

    return {
        seed,
        mode,
        category: pickLeastRecent(interests, recentSignals, "category", rng),
        format,
        perspective: pickLeastRecent(VARIETY_AXES.perspectives, recentSignals, "perspective", rng),
        tone: pickLeastRecent(VARIETY_AXES.tones, recentSignals, "tone", rng),
        imageryWorld: pickLeastRecent(VARIETY_AXES.imageryWorlds, recentSignals, "imageryWorld", rng),
        rhetoricalDevice: pickLeastRecent(VARIETY_AXES.rhetoricalDevices, recentSignals, "rhetoricalDevice", rng),
        timeHorizon: pickLeastRecent(VARIETY_AXES.timeHorizons, recentSignals, "timeHorizon", rng),
        actionType: pickLeastRecent(VARIETY_AXES.actionTypes, recentSignals, "actionType", rng),
        difficulty: pickLeastRecent(VARIETY_AXES.difficulties, recentSignals, "difficulty", rng),
        lane: pickLeastRecent(VARIETY_AXES.lanes, recentSignals, "lane", rng)
    };
}

export function buildCandidatePlans(basePlan: InspirationPlan, count = 3): InspirationPlan[] {
    const rng = createRng(`${basePlan.seed}:candidates`);
    const laneOffset = indexIn(VARIETY_AXES.lanes, basePlan.lane);

    return Array.from({ length: Math.max(1, count) }, (_, index) => {
        const lane = VARIETY_AXES.lanes[(laneOffset + index) % VARIETY_AXES.lanes.length];

        return {
            ...basePlan,
            lane,
            tone: VARIETY_AXES.tones[(indexIn(VARIETY_AXES.tones, basePlan.tone) + index) % VARIETY_AXES.tones.length],
            imageryWorld: VARIETY_AXES.imageryWorlds[
                (indexIn(VARIETY_AXES.imageryWorlds, basePlan.imageryWorld) + index * 2) % VARIETY_AXES.imageryWorlds.length
            ],
            rhetoricalDevice: VARIETY_AXES.rhetoricalDevices[
                (indexIn(VARIETY_AXES.rhetoricalDevices, basePlan.rhetoricalDevice) + index) % VARIETY_AXES.rhetoricalDevices.length
            ],
            difficulty: VARIETY_AXES.difficulties[
                (indexIn(VARIETY_AXES.difficulties, basePlan.difficulty) + index) % VARIETY_AXES.difficulties.length
            ],
            seed: `${basePlan.seed}:${lane}:${Math.floor(rng() * 1_000_000)}`
        };
    });
}
