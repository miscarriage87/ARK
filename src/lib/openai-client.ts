import OpenAI from "openai";
import type { ZodType } from "zod";

/**
 * Shared OpenAI client + a small helper for Structured Outputs via Chat Completions.
 * The client is null when OPENAI_API_KEY is missing so callers can degrade gracefully.
 */
export const openai = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

export function isOpenAIConfigured(): boolean {
    return openai !== null;
}

/** GPT-5.x, GPT-6 and o-series models are reasoning models: they take reasoning_effort instead of temperature. */
export function isReasoningModel(model: string): boolean {
    return /^(gpt-[5-9]|o\d)/.test(model);
}

export function seedToNumber(seed: string): number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }
    return hash;
}

export type StructuredCompletionInput<T> = {
    model: string;
    system: string;
    user: string;
    schema: ZodType<T>;
    responseFormat: OpenAI.Chat.Completions.ChatCompletionCreateParams["response_format"];
    temperature?: number;
    reasoningEffort?: "none" | "minimal" | "low" | "medium" | "high";
    seed?: string;
    cacheKey?: string;
    safetyIdentifier?: string;
    timeoutMs?: number;
};

export async function structuredCompletion<T>(input: StructuredCompletionInput<T>): Promise<T> {
    if (!openai) {
        throw new Error("OpenAI client not configured");
    }

    const completion = await openai.chat.completions.create({
        model: input.model,
        messages: [
            { role: "system", content: input.system },
            { role: "user", content: input.user }
        ],
        response_format: input.responseFormat,
        ...(input.seed ? { seed: seedToNumber(input.seed) } : {}),
        ...(input.cacheKey ? { prompt_cache_key: input.cacheKey } : {}),
        ...(input.safetyIdentifier ? { safety_identifier: input.safetyIdentifier } : {}),
        ...(isReasoningModel(input.model)
            ? { reasoning_effort: input.reasoningEffort ?? "low" }
            : { temperature: input.temperature ?? 1 })
    }, { timeout: input.timeoutMs ?? 45_000 });

    const content = completion.choices[0]?.message.content;
    if (!content) {
        throw new Error(`OpenAI (${input.model}) returned an empty response`);
    }

    return input.schema.parse(JSON.parse(content));
}
