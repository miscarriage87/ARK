import type { ModeWeights } from "./inspiration-plan";
import { safeJsonParse } from "./utils";

/**
 * Resolved per-user AI configuration (admin overrides merged with defaults).
 */
export type ResolvedAIConfig = {
    temperature: number;
    modeWeights: ModeWeights;
    masterPrompt: string;
    model: string;
    premiumModel: string;
    fallbackModel: string;
    judgeModel: string;
    profileModel: string;
    candidateCount: number;
};

/**
 * Model routing defaults. Verified against https://developers.openai.com/api/docs/models:
 * - gpt-5.6-terra: balanced intelligence/cost (mini tier), chat completions + structured outputs
 * - gpt-5.6-sol:   flagship, used for the occasional premium leaf
 * - gpt-5.6-luna:  cheapest GPT-5.6 tier, used for judging and profile summaries
 * - gpt-5.4-mini:  proven fallback route
 */
export const DEFAULT_AI_CONFIG: ResolvedAIConfig = {
    temperature: 1.0,
    modeWeights: { quote: 50, question: 30, pulse: 20 },
    masterPrompt: "",
    model: "gpt-5.6-terra",
    premiumModel: "gpt-5.6-sol",
    fallbackModel: "gpt-5.4-mini",
    judgeModel: "gpt-5.6-luna",
    profileModel: "gpt-5.6-luna",
    candidateCount: 3
};

export function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function nonEmpty(value: unknown, fallback: string): string {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

export function resolveAiConfig(rawConfig: string | null | undefined): ResolvedAIConfig {
    const parsed = safeJsonParse<Partial<ResolvedAIConfig>>(rawConfig, {});
    const modeWeights = {
        ...DEFAULT_AI_CONFIG.modeWeights,
        ...(parsed.modeWeights || {})
    };

    return {
        temperature: clamp(Number(parsed.temperature ?? DEFAULT_AI_CONFIG.temperature), 0, 2),
        modeWeights: {
            quote: clamp(Number(modeWeights.quote ?? 0), 0, 100),
            question: clamp(Number(modeWeights.question ?? 0), 0, 100),
            pulse: clamp(Number(modeWeights.pulse ?? 0), 0, 100)
        },
        masterPrompt: typeof parsed.masterPrompt === "string" ? parsed.masterPrompt : "",
        model: nonEmpty(parsed.model, DEFAULT_AI_CONFIG.model),
        premiumModel: nonEmpty(parsed.premiumModel, DEFAULT_AI_CONFIG.premiumModel),
        fallbackModel: nonEmpty(parsed.fallbackModel, DEFAULT_AI_CONFIG.fallbackModel),
        judgeModel: nonEmpty(parsed.judgeModel, DEFAULT_AI_CONFIG.judgeModel),
        profileModel: nonEmpty(parsed.profileModel, DEFAULT_AI_CONFIG.profileModel),
        candidateCount: clamp(Math.round(Number(parsed.candidateCount ?? DEFAULT_AI_CONFIG.candidateCount)), 1, 5)
    };
}
