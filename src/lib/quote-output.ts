import { z } from "zod";

/**
 * Structured Output contracts for the OpenAI calls (candidate generation, judging, taste summary).
 * Keep the Zod schema and the JSON schema in sync: Zod validates, JSON schema constrains the model.
 */

export const QuoteConceptSchema = z.object({
    word: z.string().trim().min(1).max(60),
    definition: z.string().trim().min(1).max(300)
});

export const QuoteCandidateSchema = z.object({
    headline: z.string().trim().min(2).max(48),
    content: z.string().trim().min(20).max(220),
    author: z.string().trim().min(1).max(80),
    explanation: z.string().trim().min(20).max(700),
    microAction: z.string().trim().min(5).max(140),
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
                headline: { type: "string", description: "2-5 Wörter, Titel des Kalenderblatts" },
                content: { type: "string", description: "Der eigentliche Gedanke, 60-150 Zeichen" },
                author: { type: "string" },
                explanation: { type: "string", description: "2-3 kurze Sätze in Du-Form" },
                microAction: { type: "string", description: "Ein konkreter kleiner Schritt für heute, beginnt mit einem Verb" },
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
                "headline",
                "content",
                "author",
                "explanation",
                "microAction",
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

// --- Judge: ranks candidates on clarity, impact and fit ---

export const JudgeEvaluationSchema = z.object({
    index: z.number().int().min(0),
    clarity: z.number().min(0).max(10),
    impact: z.number().min(0).max(10),
    fit: z.number().min(0).max(10),
    comment: z.string().max(240)
});

export const JudgeVerdictSchema = z.object({
    evaluations: z.array(JudgeEvaluationSchema).min(1)
});

export type JudgeVerdict = z.infer<typeof JudgeVerdictSchema>;

export const judgeResponseFormat = {
    type: "json_schema",
    json_schema: {
        name: "daily_inspiration_judge",
        strict: true,
        schema: {
            type: "object",
            additionalProperties: false,
            properties: {
                evaluations: {
                    type: "array",
                    items: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                            index: { type: "integer", description: "Index des Kandidaten (0-basiert)" },
                            clarity: { type: "number", description: "0-10: sofort verständlich, konkret, kein Jargon" },
                            impact: { type: "number", description: "0-10: überrascht, bleibt hängen, bewegt zu einem Gedanken oder Schritt" },
                            fit: { type: "number", description: "0-10: passt zu Interessen und Nutzerprofil, wiederholt nichts" },
                            comment: { type: "string", description: "Ein kurzer Satz Begründung" }
                        },
                        required: ["index", "clarity", "impact", "fit", "comment"]
                    }
                }
            },
            required: ["evaluations"]
        }
    }
} as const;

// --- Taste summary: turns ratings into short writing guidance ---

export const TasteSummarySchema = z.object({
    summary: z.string().trim().min(10).max(500),
    guidance: z.string().trim().min(10).max(600),
    preferPatterns: z.array(z.string().trim().min(2).max(80)).max(5),
    avoidPatterns: z.array(z.string().trim().min(2).max(80)).max(5)
});

export type TasteSummary = z.infer<typeof TasteSummarySchema>;

export const tasteSummaryResponseFormat = {
    type: "json_schema",
    json_schema: {
        name: "taste_profile_summary",
        strict: true,
        schema: {
            type: "object",
            additionalProperties: false,
            properties: {
                summary: { type: "string", description: "2-3 Sätze auf Deutsch: Was kommt an, was nicht" },
                guidance: { type: "string", description: "Bis zu 4 konkrete Schreibregeln: 'Bevorzuge ... Vermeide ...'" },
                preferPatterns: { type: "array", items: { type: "string" }, maxItems: 5 },
                avoidPatterns: { type: "array", items: { type: "string" }, maxItems: 5 }
            },
            required: ["summary", "guidance", "preferPatterns", "avoidPatterns"]
        }
    }
} as const;
