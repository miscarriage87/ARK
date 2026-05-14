import OpenAI from "openai";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { HistoryCompressor } from "./history-compressor";
import {
    buildCandidatePlans,
    buildInspirationPlan,
    type InspirationPlan,
    type ModeWeights,
    type RecentInspirationSignal
} from "./inspiration-plan";
import {
    QuoteCandidateSchema,
    quoteCandidateResponseFormat,
    type QuoteCandidate
} from "./quote-output";
import {
    scoreQuoteCandidate,
    type NoveltyScore,
    type RecentQuoteForScoring
} from "./novelty-scorer";
import { formatAppDate, safeJsonParse, logger } from "./utils";

const openai = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

export const PROMPT_VERSION = "ark-variety-v1";

// --- EXPORTED SYSTEM CONSTANTS (For Admin Visibility) ---

export const CATEGORY_STYLE_GUIDE = {
    "Achtsamkeit": `
- Pflicht: 1 konkretes Sinnesdetail (Geräusch, Textur, Licht, Temperatur).
- Fokus: Beobachten, Entschleunigung, Präsenz.
- Vermeide: Esoterik-Floskeln, "Universum".`,

    "Spiritualität": `
- Pflicht: Perspektive 'Größer als ich' (Verbindung, Sinn, Staunen).
- Ton: Tiefgründig, aber geerdet (kein "Licht & Liebe" Kitsch).
- Vermeide: Dogma, strafender Gott.`,

    "Stoizismus": `
- Pflicht: Fokus auf das, was kontrollierbar ist (Innenwelt vs Außenwelt).
- Ton: Rational, stärkend, nüchtern, "Amor Fati".
- Schlagworte: Tugend, Vernunft, Akzeptanz, Charakter.`,

    "Unternehmertum": `
- Pflicht: Fokus auf Wertschöpfung, Problemlösung oder Resilienz.
- Ton: High Agency, proaktiv, risikobewusst, "Skin in the Game".
- Vermeide: Passivität, "Hoffnung", "Glück haben".`,

    "Wissenschaft": `
- Pflicht: Neugier, Hypothese, Experiment oder kosmische Perspektive.
- Ton: Rationales Staunen, evidenzbasiert, präzise.
- Metaphern: Labor, Naturgesetze, Evolution, Kosmos.`,

    "Kunst": `
- Pflicht: Ausdruck, Perspektivwechsel, Schönheit im Hässlichen.
- Ton: Expressiv, brechend, subjektiv, emotional.
- Fokus: Der kreative Akt als Lebenshaltung.`,

    "Poesie": `
- Pflicht: Fokus auf Sprachmelodie, starke Metaphern, Verdichtung.
- Ton: Lyrisch, sanft, aber bildgewaltig.
- Stil: Nutze Alliteration oder Rhythmus.`,

    "Führung": `
- Pflicht: Verantwortung, Dienen, Klarheit, schwierige Entscheidungen.
- Ton: Souverän, fordernd aber unterstützend (Servant Leadership).
- Vermeide: Management-Speak, "Synergien".`,

    "Wellness": `
- Pflicht: Körper-Geist-Verbindung, Energie-Management, Erholung.
- Ton: Fürsorglich, biologisch fundiert, vital.
- Fokus: Schlaf, Bewegung, Ernährung, Stressabbau.`,

    "DEFAULT": `
- Pflicht: Fokus auf ECHTE Erfahrung, nicht Theorie.
- Ton: Modern, direkt, 'No-BS'.
- Vermeide Metaphysik wenn nicht explizit gefordert.`
};

export const ARCHETYPES_FOR_MODE = {
    QUOTE: ["Paradox", "Aphorismus-Regel", "Mini-Metapher", "Koan-light", "Beobachtung", "Konsequenz-Satz"],
    QUESTION: ["Werte-Check", "Schatten-Spotlight", "Mikro-Experiment", "Reframing", "Beziehungs-Spiegel", "Kosten-der-Ausrede"],
    PULSE: ["10-Sekunden-Aktion", "Wenn-Dann-Schalter", "Mut-Trigger", "Fokus-Satz", "Paradox-Impuls", "Grenze-setzen"]
};

export const MODE_INSTRUCTIONS = {
    QUOTE: `
- Erzeuge einen ORIGINAL-Aphorismus (kein echtes Zitat behaupten).
- author: "Einsicht"
- Kein Fragezeichen.`,
    QUESTION: `
- Formuliere eine radikale, direkte Frage in Du-Form.
- Keine Standardfragen, kein "Was hält dich ab".
- author: "Reflexion"`,
    PULSE: `
- Formuliere einen kurzen Impuls/Mantra in Du-Form, handlungsnah.
- Kein Atem, keine Stille.
- author: "Impuls"`
};

export const DEFAULT_MASTER_PROMPT = `
Du bist kein allgemeiner Sprüche-Automat. Du kuratierst einen digitalen Abreißkalender.
Jeder Tag muss sich anders anfühlen: andere Bildwelt, andere Denkbewegung, anderer Ton.

Format heute: {{MODE}}
Kategorie: {{CATEGORY}}
User-Interessen: {{INTERESTS}}

KATEGORIE-LINSE:
{{CATEGORY_STYLE_GUIDE}}

MODE-INSTRUKTIONEN:
{{MODE_INSTRUCTIONS}}

ANTI-KLISCHEE:
- Kein Start mit: "Was hält dich davon ab", "Fühle", "In der Stille"
- Vermeide: "Tauch ein", "Lass los", "Hier und Jetzt", "Atem", "Präsenz"
- Keine Floskeln über "Seele/Universum" außer Kategorie verlangt es explizit.
- content muss kurz sein (70-160 Zeichen), konkret, bildhaft und originell.

HISTORY:
Verbotene Autoren: {{BANNED_AUTHORS}}
Vermeide Konzepte: {{BANNED_CONCEPTS}}
Letzte Einträge:
{{RECENT_CONTENT}}
`;

type UserPreferences = {
    interests?: string[];
};

type AIConfig = {
    temperature: number;
    modeWeights: ModeWeights;
    masterPrompt: string;
    model: string;
    premiumModel: string;
    fallbackModel: string;
    candidateCount: number;
};

type GeneratedCandidate = {
    candidate: QuoteCandidate;
    plan: InspirationPlan;
    score: NoveltyScore;
    sourceModel: string;
};

const DEFAULT_AI_CONFIG: AIConfig = {
    temperature: 1.0,
    modeWeights: { quote: 50, question: 30, pulse: 20 },
    masterPrompt: "",
    model: "gpt-5.4-mini",
    premiumModel: "gpt-5.5",
    fallbackModel: "gpt-5.4-nano",
    candidateCount: 3
};

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function resolveAiConfig(rawConfig: string | null): AIConfig {
    const parsed = safeJsonParse<Partial<AIConfig>>(rawConfig, {});
    const modeWeights = {
        ...DEFAULT_AI_CONFIG.modeWeights,
        ...(parsed.modeWeights || {})
    };

    return {
        ...DEFAULT_AI_CONFIG,
        ...parsed,
        temperature: clamp(Number(parsed.temperature ?? DEFAULT_AI_CONFIG.temperature), 0, 2),
        modeWeights: {
            quote: clamp(Number(modeWeights.quote ?? 0), 0, 100),
            question: clamp(Number(modeWeights.question ?? 0), 0, 100),
            pulse: clamp(Number(modeWeights.pulse ?? 0), 0, 100)
        },
        candidateCount: clamp(Number(parsed.candidateCount ?? DEFAULT_AI_CONFIG.candidateCount), 1, 5)
    };
}

function promptValue(value: string | null | undefined, fallback = ""): string {
    return value && value.trim().length > 0 ? value : fallback;
}

function getStyleGuide(category: string): string {
    return CATEGORY_STYLE_GUIDE[category as keyof typeof CATEGORY_STYLE_GUIDE] || CATEGORY_STYLE_GUIDE.DEFAULT;
}

function recentContentBlock(recentQuotes: RecentQuoteForScoring[]): string {
    if (recentQuotes.length === 0) return "(Neu)";

    return recentQuotes
        .slice(0, 10)
        .map((quote, index) => {
            const meta = [
                quote.category,
                quote.format,
                quote.tone,
                quote.imageryWorld,
                quote.rhetoricalDevice
            ].filter(Boolean).join(" / ");

            return `${index + 1}. ${meta ? `[${meta}] ` : ""}${quote.content}`;
        })
        .join("\n");
}

function substitutePrompt(input: {
    template: string;
    plan: InspirationPlan;
    interests: string[];
    historyData: { authorsString: string; conceptsString: string; fullCode: string };
    recentQuotes: RecentQuoteForScoring[];
}): string {
    const archetypes = ARCHETYPES_FOR_MODE[input.plan.mode] || ["Standard"];

    return input.template
        .replace(/{{MODE}}/g, input.plan.mode)
        .replace(/{{INTERESTS}}/g, input.interests.join(", ") || "Leben, Liebe, Erfolg")
        .replace(/{{CATEGORY}}/g, input.plan.category)
        .replace(/{{BANNED_AUTHORS}}/g, promptValue(input.historyData.authorsString, "Keine"))
        .replace(/{{BANNED_CONCEPTS}}/g, promptValue(input.historyData.conceptsString, "Keine"))
        .replace(/{{HISTORY_CODE}}/g, promptValue(input.historyData.fullCode, "(Neu)"))
        .replace(/{{RECENT_CONTENT}}/g, recentContentBlock(input.recentQuotes))
        .replace(/{{CATEGORY_STYLE_GUIDE}}/g, getStyleGuide(input.plan.category))
        .replace(/{{ARCHETYPES_FOR_MODE}}/g, archetypes.join(", "))
        .replace(/{{MODE_INSTRUCTIONS}}/g, MODE_INSTRUCTIONS[input.plan.mode] || "");
}

function composeCandidatePrompt(input: {
    plan: InspirationPlan;
    interests: string[];
    historyData: { authorsString: string; conceptsString: string; fullCode: string };
    recentQuotes: RecentQuoteForScoring[];
    masterPrompt: string;
}): string {
    const basePrompt = substitutePrompt({
        template: input.masterPrompt || DEFAULT_MASTER_PROMPT,
        plan: input.plan,
        interests: input.interests,
        historyData: input.historyData,
        recentQuotes: input.recentQuotes
    });

    return `${basePrompt}

VARIETY PLAN (strictly follow this lane):
- lane: ${input.plan.lane}
- format: ${input.plan.format}
- perspective: ${input.plan.perspective}
- tone: ${input.plan.tone}
- imageryWorld: ${input.plan.imageryWorld}
- rhetoricalDevice: ${input.plan.rhetoricalDevice}
- timeHorizon: ${input.plan.timeHorizon}
- actionType: ${input.plan.actionType}
- difficulty: ${input.plan.difficulty}

ABWECHSLUNGSPFLICHT:
- Schreibe nicht wie die letzten Einträge.
- Wiederhole keine Bildwelt, keine Satzschablone und keine Coaching-Floskel.
- Nutze den Plan sichtbar, aber nicht mechanisch.
- content und explanation müssen auf Deutsch sein.
- concepts dürfen nur Wörter enthalten, die wirklich in content oder explanation vorkommen.

Output: exactly one JSON object matching the configured schema.`;
}

function seedToNumber(seed: string): number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }
    return hash;
}

function isReasoningModel(model: string): boolean {
    return /^(gpt-5|o\d)/.test(model);
}

function shouldUsePremiumModel(plan: InspirationPlan): boolean {
    return seedToNumber(`${plan.seed}:premium`) % 7 === 0;
}

function selectModelForPlan(plan: InspirationPlan, aiConfig: AIConfig, index: number): string {
    if (index === 2 && shouldUsePremiumModel(plan)) {
        return aiConfig.premiumModel || aiConfig.model;
    }

    return aiConfig.model;
}

async function generateCandidateWithOpenAI(input: {
    plan: InspirationPlan;
    prompt: string;
    aiConfig: AIConfig;
    model: string;
    userId: string;
}): Promise<QuoteCandidate> {
    if (!openai) {
        throw new Error("OpenAI client not configured");
    }

    const completion = await openai.chat.completions.create({
        model: input.model,
        messages: [
            {
                role: "system",
                content: "Du erzeugst präzise, originelle Tagesinspirationen als gültiges JSON. Keine Erklärungen außerhalb des JSON."
            },
            { role: "user", content: input.prompt }
        ],
        response_format: quoteCandidateResponseFormat,
        seed: seedToNumber(input.plan.seed),
        prompt_cache_key: PROMPT_VERSION,
        safety_identifier: seedToNumber(input.userId).toString(16),
        ...(isReasoningModel(input.model)
            ? { reasoning_effort: "low" as const }
            : { temperature: input.aiConfig.temperature })
    }, { timeout: 45_000 });

    const content = completion.choices[0]?.message.content;
    if (!content) {
        throw new Error("OpenAI returned an empty candidate");
    }

    return QuoteCandidateSchema.parse(JSON.parse(content));
}

function createOfflineCandidate(plan: InspirationPlan): QuoteCandidate {
    const contentByMode = {
        QUOTE: `Zwischen ${plan.imageryWorld} und ${plan.category}: Ein neuer Blick beginnt dort, wo die alte Antwort zu bequem wird.`,
        QUESTION: `Welche Gewohnheit in deiner ${plan.category}-Welt verdient heute einen Blick von außen statt Applaus?`,
        PULSE: `Teste heute eine kleine ${plan.category}-Entscheidung: weniger Reflex, mehr klare Hand.`
    };

    return {
        content: contentByMode[plan.mode],
        author: plan.mode === "QUOTE" ? "Einsicht" : plan.mode === "QUESTION" ? "Reflexion" : "Impuls",
        explanation: `Dieser Eintrag nutzt die ${plan.lane}-Perspektive und verschiebt den Fokus auf eine konkrete Beobachtung. Er ist als fallback gedacht, falls die Modellgenerierung nicht verfügbar ist.`,
        category: plan.category,
        concepts: [],
        format: plan.format,
        tone: plan.tone,
        imageryWorld: plan.imageryWorld,
        rhetoricalDevice: plan.rhetoricalDevice
    };
}

async function getRecentQuotes(userId: string, beforeDate: string): Promise<RecentQuoteForScoring[]> {
    const views = await prisma.dailyView.findMany({
        where: {
            userId,
            date: { lt: beforeDate }
        },
        orderBy: { date: "desc" },
        take: 30,
        include: {
            quote: {
                select: {
                    content: true,
                    category: true,
                    format: true,
                    tone: true,
                    imageryWorld: true,
                    rhetoricalDevice: true
                }
            }
        }
    });

    return views.map((view) => ({
        content: view.quote.content,
        category: view.quote.category,
        format: view.quote.format,
        tone: view.quote.tone,
        imageryWorld: view.quote.imageryWorld,
        rhetoricalDevice: view.quote.rhetoricalDevice
    }));
}

function recentSignalsFromQuotes(recentQuotes: RecentQuoteForScoring[]): RecentInspirationSignal[] {
    return recentQuotes.map((quote) => ({
        category: quote.category || undefined,
        format: quote.format || undefined,
        tone: quote.tone || undefined,
        imageryWorld: quote.imageryWorld || undefined,
        rhetoricalDevice: quote.rhetoricalDevice || undefined
    }));
}

async function generateCandidates(input: {
    userId: string;
    plans: InspirationPlan[];
    interests: string[];
    historyData: { authorsString: string; conceptsString: string; fullCode: string };
    recentQuotes: RecentQuoteForScoring[];
    aiConfig: AIConfig;
}): Promise<GeneratedCandidate[]> {
    const attempts = await Promise.all(input.plans.map(async (plan, index) => {
        const model = selectModelForPlan(plan, input.aiConfig, index);
        const prompt = composeCandidatePrompt({
            plan,
            interests: input.interests,
            historyData: input.historyData,
            recentQuotes: input.recentQuotes,
            masterPrompt: input.aiConfig.masterPrompt
        });

        try {
            const candidate = openai
                ? await generateCandidateWithOpenAI({
                    plan,
                    prompt,
                    aiConfig: input.aiConfig,
                    model,
                    userId: input.userId
                })
                : createOfflineCandidate(plan);
            const normalizedCandidate = {
                ...candidate,
                category: plan.category,
                format: candidate.format || plan.format,
                tone: candidate.tone || plan.tone,
                imageryWorld: candidate.imageryWorld || plan.imageryWorld,
                rhetoricalDevice: candidate.rhetoricalDevice || plan.rhetoricalDevice
            };
            const score = scoreQuoteCandidate({
                candidate: normalizedCandidate,
                plan,
                recentQuotes: input.recentQuotes
            });

            return {
                candidate: normalizedCandidate,
                plan,
                score,
                sourceModel: openai ? model : "offline-variety"
            };
        } catch (error) {
            logger.warn("[QuoteService] Candidate generation failed", {
                lane: plan.lane,
                model,
                error: error instanceof Error ? error.message : "unknown"
            });

            if (model !== input.aiConfig.fallbackModel && openai) {
                try {
                    const candidate = await generateCandidateWithOpenAI({
                        plan,
                        prompt,
                        aiConfig: input.aiConfig,
                        model: input.aiConfig.fallbackModel,
                        userId: input.userId
                    });
                    const score = scoreQuoteCandidate({ candidate, plan, recentQuotes: input.recentQuotes });
                    return {
                        candidate,
                        plan,
                        score,
                        sourceModel: input.aiConfig.fallbackModel
                    };
                } catch {
                    return null;
                }
            }

            return null;
        }
    }));

    return attempts.filter((candidate): candidate is GeneratedCandidate => candidate !== null);
}

function chooseWinner(candidates: GeneratedCandidate[]): GeneratedCandidate {
    const winner = candidates
        .slice()
        .sort((a, b) => b.score.score - a.score.score)[0];

    if (!winner) {
        throw new Error("No quote candidates could be generated");
    }

    return winner;
}

async function buildGenerationContext(userId: string, date: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const prefs = safeJsonParse<UserPreferences>(user?.preferences, {});
    const interests = Array.isArray(prefs.interests) ? prefs.interests : [];
    const aiConfig = resolveAiConfig(user?.aiConfig || null);
    const recentQuotes = await getRecentQuotes(userId, date);
    const historyData = await HistoryCompressor.calculateUserHistoryCode(userId, interests);
    const basePlan = buildInspirationPlan({
        userId,
        date,
        interests,
        modeWeights: aiConfig.modeWeights,
        recentSignals: recentSignalsFromQuotes(recentQuotes)
    });
    const plans = buildCandidatePlans(basePlan, aiConfig.candidateCount);

    return {
        user,
        prefs,
        interests,
        aiConfig,
        recentQuotes,
        historyData,
        basePlan,
        plans
    };
}

export async function buildDailyPromptPreview(userId: string, forcedDate?: string) {
    const date = forcedDate || formatAppDate();
    const context = await buildGenerationContext(userId, date);
    const plan = context.plans[0] || context.basePlan;

    if (!context.user) {
        throw new Error("User not found");
    }

    return {
        date,
        plan,
        prompt: composeCandidatePrompt({
            plan,
            interests: context.interests,
            historyData: context.historyData,
            recentQuotes: context.recentQuotes,
            masterPrompt: context.aiConfig.masterPrompt
        })
    };
}

export async function getDailyQuote(userId: string, forcedDate?: string) {
    const today = forcedDate || formatAppDate();

    const history = await prisma.dailyView.findUnique({
        where: {
            userId_date: {
                userId,
                date: today
            }
        },
        include: {
            quote: true
        }
    });

    if (history) {
        const rating = await prisma.rating.findFirst({ where: { userId, quoteId: history.quoteId } });
        return {
            ...history.quote,
            isNew: false,
            isLiked: !!rating
        };
    }

    logger.info(`[QuoteService] Generating daily inspiration for user ${userId} on ${today}`);

    const context = await buildGenerationContext(userId, today);
    const candidates = await generateCandidates({
        userId,
        plans: context.plans,
        interests: context.interests,
        historyData: context.historyData,
        recentQuotes: context.recentQuotes,
        aiConfig: context.aiConfig
    });
    const winner = chooseWinner(candidates);
    const generationTrace = JSON.stringify({
        promptVersion: PROMPT_VERSION,
        selectedLane: winner.plan.lane,
        selectedScore: winner.score,
        candidates: candidates.map((candidate) => ({
            lane: candidate.plan.lane,
            model: candidate.sourceModel,
            score: candidate.score.score,
            reasons: candidate.score.reasons
        }))
    });
    const conceptsStr = JSON.stringify(winner.candidate.concepts || []);

    const quote = await prisma.quote.create({
        data: {
            content: winner.candidate.content,
            author: winner.candidate.author,
            explanation: winner.candidate.explanation,
            category: winner.candidate.category,
            concepts: conceptsStr,
            sourceModel: winner.sourceModel,
            mode: winner.plan.mode,
            format: winner.candidate.format,
            perspective: winner.plan.perspective,
            tone: winner.candidate.tone,
            imageryWorld: winner.candidate.imageryWorld,
            rhetoricalDevice: winner.candidate.rhetoricalDevice,
            timeHorizon: winner.plan.timeHorizon,
            actionType: winner.plan.actionType,
            difficulty: winner.plan.difficulty,
            promptVersion: PROMPT_VERSION,
            provider: openai ? "openai" : "offline",
            noveltyScore: winner.score.score,
            generationTrace
        }
    });

    try {
        await prisma.dailyView.create({
            data: {
                userId,
                quoteId: quote.id,
                date: today
            }
        });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            await prisma.quote.delete({ where: { id: quote.id } }).catch(() => undefined);
            const winnerView = await prisma.dailyView.findUnique({
                where: {
                    userId_date: { userId, date: today }
                },
                include: { quote: true }
            });

            if (winnerView) {
                return {
                    ...winnerView.quote,
                    isNew: false,
                    isLiked: false
                };
            }
        }

        logger.error("[QuoteService] Error creating dailyView:", error);
    }

    const rating = await prisma.rating.findFirst({
        where: { userId, quoteId: quote.id }
    });

    return { ...quote, isNew: true, isLiked: !!rating };
}
