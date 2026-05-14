import { z } from "zod";

export const QuoteConceptSchema = z.object({
    word: z.string().trim().min(1).max(60),
    definition: z.string().trim().min(1).max(300)
});

export const QuoteCandidateSchema = z.object({
    content: z.string().trim().min(20).max(220),
    author: z.string().trim().min(1).max(80),
    explanation: z.string().trim().min(20).max(700),
    category: z.string().trim().min(1).max(80),
    concepts: z.array(QuoteConceptSchema).max(3),
    format: z.string().trim().min(1).max(80),
    tone: z.string().trim().min(1).max(80),
    imageryWorld: z.string().trim().min(1).max(80),
    rhetoricalDevice: z.string().trim().min(1).max(80)
});

export type QuoteCandidate = z.infer<typeof QuoteCandidateSchema>;

export const quoteCandidateResponseFormat = {
    type: "json_schema",
    json_schema: {
        name: "daily_inspiration_candidate",
        strict: true,
        schema: {
            type: "object",
            additionalProperties: false,
            properties: {
                content: { type: "string" },
                author: { type: "string" },
                explanation: { type: "string" },
                category: { type: "string" },
                concepts: {
                    type: "array",
                    maxItems: 3,
                    items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                            word: { type: "string" },
                            definition: { type: "string" }
                        },
                        required: ["word", "definition"]
                    }
                },
                format: { type: "string" },
                tone: { type: "string" },
                imageryWorld: { type: "string" },
                rhetoricalDevice: { type: "string" }
            },
            required: [
                "content",
                "author",
                "explanation",
                "category",
                "concepts",
                "format",
                "tone",
                "imageryWorld",
                "rhetoricalDevice"
            ]
        }
    }
} as const;
