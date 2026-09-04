import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { HistoryCompressor } from "./history-compressor";
import {
    buildCandidatePlans,
    buildInspirationPlan,
    type InspirationPlan,
    type RecentInspirationSignal
} from "./inspiration-plan";
import {
    JudgeVerdictSchema,
    QuoteCandidateSchema,
    judgeResponseFormat,
    quoteCandidateResponseFormat,
    type QuoteCandidate
} from "./quote-output";
import {
    scoreQuoteCandidate,
    type NoveltyScore,
    type RecentQuoteForScoring
} from "./novelty-scorer";
import { formatAppDate, safeJsonParse, logger } from "./utils";
import { isOpenAIConfigured, structuredCompletion } from "./openai-client";
import { resolveAiConfig, type ResolvedAIConfig } from "./ai-config";
import { ensureFreshTasteProfile } from "./feedback-service";
import {
    planPreferencesFromProfile,
    tasteProfilePromptBlock,
    verdictFromScore,
    type RatingVerdict,
    type TasteProfile
} from "./taste-profile";

export const PROMPT_VERSION = "ark-variety-v2";

// --- EXPORTED SYSTEM CONSTANTS (For Admin Visibility) ---

export const CATEGORY_STYLE_GUIDE = {
    "Achtsamkeit": `
- Pflicht: 1 konkretes Sinnesdetail (Geräusch, Textur, Licht, Temperatur).
- Fokus: Beobachten, Entschleunigung, Präsenz im Alltag.
- Vermeide: Esoterik-Floskeln, "Universum", Atem-Anweisungen.`,

    "Spiritualität": `
- Pflicht: Perspektive 'Größer als ich' (Verbindung, Sinn, Staunen).
- Ton: Tiefgründig, aber geerdet (kein "Licht & Liebe" Kitsch).
- Vermeide: Dogma, strafender Gott, Nebelsprache.`,

    "Stoizismus": `
- Pflicht: Fokus auf das, was kontrollierbar ist (Innenwelt vs Außenwelt).
- Ton: Rational, stärkend, nüchtern, "Amor Fati".
- Schlagworte: Tugend, Vernunft, Akzeptanz, Charakter.`,

    "Unternehmertum": `
- Pflicht: Fokus auf Wertschöpfung, Problemlösung oder Resilienz.
- Ton: High Agency, proaktiv, risikobewusst, "Skin in the Game".
- Vermeide: Passivität, "Hoffnung", "Glück haben", Startup-Jargon.`,

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
- Stil: Nutze Alliteration oder Rhythmus, bleib trotzdem verständlich.`,

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
- Erzeuge einen ORIGINAL-Aphorismus (kein echtes Zitat, keinen echten Namen behaupten).
- Ein Bild, eine Wendung, ein Gedanke. Kein Fragezeichen.
- author: "Einsicht"`,
    QUESTION: `
- Formuliere genau EINE direkte Frage in Du-Form, die man ehrlich nur mit einer konkreten Antwort beantworten kann.
- Keine rhetorische Frage, keine Doppelfrage, kein "Was hält dich ab".
- author: "Reflexion"`,
    PULSE: `
- Formuliere einen kurzen Impuls in Du-Form: eine Handlung, ein Schalter, ein Test für heute.
- Handlungsnah und konkret, ohne Esoterik. Kein Atem, keine Stille.
- author: "Impuls"`
};

export const LANE_GUIDE: Record<string, string> = {
    clarity: "Maximal klar und schlicht: der Gedanke muss beim ersten Lesen sitzen, ohne Schmuck.",
    sensory: "Ein starkes, konkretes Sinnesbild trägt den Gedanken (etwas, das man sehen, hören oder anfassen kann).",
    contrarian: "Dreht eine gängige Annahme freundlich um und zeigt, warum das Gegenteil hilft.",
    practical: "So konkret, dass man es heute in unter fünf Minuten tun kann."
};

export const DEFAULT_MASTER_PROMPT = `
Du kuratierst einen digitalen Abreißkalender. Jeden Tag genau ein Blatt.
Ein gutes Blatt hat drei Eigenschaften, in dieser Reihenfolge:
1. SOFORT VERSTÄNDLICH: Beim ersten Lesen klar, ohne Vorwissen, ohne Fachjargon. Ein Gedanke, ein Bild, eine Wendung. Keine verschachtelten Metaphern.
2. WIRKUNG: Es überrascht, bleibt hängen oder ändert heute eine kleine Entscheidung. Lieber eine konkrete Szene als eine allgemeine Weisheit.
3. ABWECHSLUNG: Es fühlt sich anders an als die letzten Blätter: andere Bildwelt, anderer Rhythmus, andere Denkbewegung.

Format heute: {{MODE}}
Kategorie: {{CATEGORY}}
User-Interessen: {{INTERESTS}}
Wochentag-Färbung: {{DAY_FLAVOR}}

KATEGORIE-LINSE:
{{CATEGORY_STYLE_GUIDE}}

MODE-INSTRUKTIONEN:
{{MODE_INSTRUCTIONS}}

{{TASTE_PROFILE}}

BAUPLAN DES BLATTS:
- headline: 2-5 Wörter, wie ein Titel auf dem Kalenderblatt. Konkret, macht neugierig, kein Klischee, kein Doppelpunkt.
- content: 1 Satz (höchstens 2 kurze), 60-150 Zeichen. Einfache Wörter, konkrete Dinge, ein klarer Gedanke. Kein Nebensatz-Gestrüpp.
- explanation: 2-3 kurze Sätze in Du-Form. Erster Satz: Was der Gedanke im Kern meint, so einfach, dass es ein Kind versteht. Zweiter Satz: Warum das heute nützt. Nicht den content wiederholen.
- microAction: Ein konkreter, kleiner Schritt für heute (max. 90 Zeichen). Beginnt mit einem Verb, ist beobachtbar oder messbar, passt zum actionType des Plans.
- concepts: 0-3 Wörter aus content oder explanation, die eine kurze Erklärung verdienen (Definition in einem Satz).

ANTI-KLISCHEE (hart):
- Kein Start mit: "Was hält dich davon ab", "Fühle", "In der Stille", "Stell dir vor"
- Vermeide: "Tauch ein", "Lass los", "Hier und Jetzt", "Atem", "Präsenz", "Reise", "Energie", "Universum", "Magie", "Sei einfach"
- Keine Kalenderspruch-Allgemeinplätze ("Jeder Tag ist ein Geschenk"). Keine Reihung von drei Adjektiven.
- Keine Seelen-/Universums-Floskeln, außer die Kategorie verlangt es ausdrücklich.

HISTORY:
Verbotene Autoren: {{BANNED_AUTHORS}}
Vermeide Konzepte: {{BANNED_CONCEPTS}}
Letzte Einträge (so NICHT noch einmal):
{{RECENT_CONTENT}}
`;

type UserPreferences = {
    interests?: string[];
};

type JudgeResult = {
    clarity: number;
    impact: number;
    fit: number;
    comment: string;
    /** 0..1 */
    score: number;
};

type GeneratedCandidate = {
    candidate: QuoteCandidate;
    plan: InspirationPlan;
    score: NoveltyScore;
    sourceModel: string;
    judge: JudgeResult | null;
    finalScore: number;
};

type HistoryData = { authorsString: string; conceptsString: string; fullCode: string };

const JUDGE_WEIGHT = 0.45;

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
            const headline = quote.headline ? `${quote.headline}: ` : "";

            return `${index + 1}. ${meta ? `[${meta}] ` : ""}${headline}${quote.content}`;
        })
        .join("\n");
}

function substitutePrompt(input: {
    template: string;
    plan: InspirationPlan;
    interests: string[];
    historyData: HistoryData;
    recentQuotes: RecentQuoteForScoring[];
    profile: TasteProfile | null;
}): string {
    const archetypes = ARCHETYPES_FOR_MODE[input.plan.mode] || ["Standard"];
    const tasteBlock = tasteProfilePromptBlock(input.profile);
    const template = input.template.includes("{{TASTE_PROFILE}}")
        ? input.template
        : `${input.template}\n\n{{TASTE_PROFILE}}`;

    return template
        .replace(/{{MODE}}/g, input.plan.mode)
        .replace(/{{INTERESTS}}/g, input.interests.join(", ") || "Leben, Liebe, Erfolg")
        .replace(/{{CATEGORY}}/g, input.plan.category)
        .replace(/{{DAY_FLAVOR}}/g, input.plan.dayFlavor)
        .replace(/{{BANNED_AUTHORS}}/g, promptValue(input.historyData.authorsString, "Keine"))
        .replace(/{{BANNED_CONCEPTS}}/g, promptValue(input.historyData.conceptsString, "Keine"))
        .replace(/{{HISTORY_CODE}}/g, promptValue(input.historyData.fullCode, "(Neu)"))
        .replace(/{{RECENT_CONTENT}}/g, recentContentBlock(input.recentQuotes))
        .replace(/{{CATEGORY_STYLE_GUIDE}}/g, getStyleGuide(input.plan.category).trim())
        .replace(/{{ARCHETYPES_FOR_MODE}}/g, archetypes.join(", "))
        .replace(/{{MODE_INSTRUCTIONS}}/g, (MODE_INSTRUCTIONS[input.plan.mode] || "").trim())
        .replace(/{{TASTE_PROFILE}}/g, tasteBlock);
}

function composeCandidatePrompt(input: {
    plan: InspirationPlan;
    interests: string[];
    historyData: HistoryData;
    recentQuotes: RecentQuoteForScoring[];
    masterPrompt: string;
    profile: TasteProfile | null;
}): string {
    const basePrompt = substitutePrompt({
        template: input.masterPrompt || DEFAULT_MASTER_PROMPT,
        plan: input.plan,
        interests: input.interests,
        historyData: input.historyData,
        recentQuotes: input.recentQuotes,
        profile: input.profile
    });

    return `${basePrompt}

VARIETY PLAN (strictly follow this lane):
- lane: ${input.plan.lane} (${LANE_GUIDE[input.plan.lane] || "klar und konkret"})
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
- Wiederhole keine Bildwelt, keine Satzschablone, keine headline und keine Coaching-Floskel.
- Nutze den Plan sichtbar, aber nicht mechanisch.
- headline, content, explanation und microAction müssen auf Deutsch sein.
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

function shouldUsePremiumModel(plan: InspirationPlan): boolean {
    return seedToNumber(`${plan.seed}:premium`) % 7 === 0;
}

function selectModelForPlan(plan: InspirationPlan, aiConfig: ResolvedAIConfig, index: number): string {
    if (index === 2 && shouldUsePremiumModel(plan)) {
        return aiConfig.premiumModel || aiConfig.model;
    }

    return aiConfig.model;
}

async function generateCandidateWithOpenAI(input: {
    plan: InspirationPlan;
    prompt: string;
    aiConfig: ResolvedAIConfig;
    model: string;
    userId: string;
}): Promise<QuoteCandidate> {
    return structuredCompletion({
        model: input.model,
        system: "Du erzeugst präzise, originelle und sofort verständliche Tagesinspirationen als gültiges JSON. Keine Erklärungen außerhalb des JSON.",
        user: input.prompt,
        schema: QuoteCandidateSchema,
        responseFormat: quoteCandidateResponseFormat,
        temperature: input.aiConfig.temperature,
        reasoningEffort: "low",
        seed: input.plan.seed,
        cacheKey: PROMPT_VERSION,
        safetyIdentifier: seedToNumber(input.userId).toString(16),
        timeoutMs: 45_000
    });
}

function createOfflineCandidate(plan: InspirationPlan): QuoteCandidate {
    const contentByMode = {
        QUOTE: `Zwischen ${plan.imageryWorld} und ${plan.category}: Ein neuer Blick beginnt dort, wo die alte Antwort zu bequem wird.`,
        QUESTION: `Welche Gewohnheit in deiner ${plan.category}-Welt verdient heute einen Blick von außen statt Applaus?`,
        PULSE: `Teste heute eine kleine ${plan.category}-Entscheidung: weniger Reflex, mehr klare Hand.`
    };

    return {
        headline: "Neuer Blick",
        content: contentByMode[plan.mode],
        author: plan.mode === "QUOTE" ? "Einsicht" : plan.mode === "QUESTION" ? "Reflexion" : "Impuls",
        explanation: `Dieser Eintrag nutzt die ${plan.lane}-Perspektive und verschiebt den Fokus auf eine konkrete Beobachtung. Er ist als Fallback gedacht, falls die Modellgenerierung nicht verfügbar ist.`,
        microAction: "Schreib heute einen Satz auf, den du sonst nur denkst.",
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
                    headline: true,
                    category: true,
                    format: true,
                    perspective: true,
                    tone: true,
                    imageryWorld: true,
                    rhetoricalDevice: true,
                    timeHorizon: true,
                    actionType: true,
                    difficulty: true
                }
            }
        }
    });

    return views.map((view) => ({
        content: view.quote.content,
        headline: view.quote.headline,
        category: view.quote.category,
        format: view.quote.format,
        perspective: view.quote.perspective,
        tone: view.quote.tone,
        imageryWorld: view.quote.imageryWorld,
        rhetoricalDevice: view.quote.rhetoricalDevice,
        timeHorizon: view.quote.timeHorizon,
        actionType: view.quote.actionType,
        difficulty: view.quote.difficulty
    }));
}

function recentSignalsFromQuotes(recentQuotes: RecentQuoteForScoring[]): RecentInspirationSignal[] {
    return recentQuotes.map((quote) => ({
        category: quote.category || undefined,
        format: quote.format || undefined,
        perspective: quote.perspective || undefined,
        tone: quote.tone || undefined,
        imageryWorld: quote.imageryWorld || undefined,
        rhetoricalDevice: quote.rhetoricalDevice || undefined,
        timeHorizon: quote.timeHorizon || undefined,
        actionType: quote.actionType || undefined,
        difficulty: quote.difficulty || undefined
    }));
}

function normalizeCandidate(candidate: QuoteCandidate, plan: InspirationPlan): QuoteCandidate {
    return {
        ...candidate,
        category: plan.category,
        format: candidate.format || plan.format,
        tone: candidate.tone || plan.tone,
        imageryWorld: candidate.imageryWorld || plan.imageryWorld,
        rhetoricalDevice: candidate.rhetoricalDevice || plan.rhetoricalDevice
    };
}

async function generateCandidates(input: {
    userId: string;
    plans: InspirationPlan[];
    interests: string[];
    historyData: HistoryData;
    recentQuotes: RecentQuoteForScoring[];
    aiConfig: ResolvedAIConfig;
    profile: TasteProfile | null;
}): Promise<GeneratedCandidate[]> {
    const online = isOpenAIConfigured();

    const attempts = await Promise.all(input.plans.map(async (plan, index) => {
        const model = selectModelForPlan(plan, input.aiConfig, index);
        const prompt = composeCandidatePrompt({
            plan,
            interests: input.interests,
            historyData: input.historyData,
            recentQuotes: input.recentQuotes,
            masterPrompt: input.aiConfig.masterPrompt,
            profile: input.profile
        });

        const build = (candidate: QuoteCandidate, sourceModel: string): GeneratedCandidate => {
            const normalized = normalizeCandidate(candidate, plan);
            const score = scoreQuoteCandidate({
                candidate: normalized,
                plan,
                recentQuotes: input.recentQuotes,
                profile: input.profile
            });

            return { candidate: normalized, plan, score, sourceModel, judge: null, finalScore: score.score };
        };

        try {
            const candidate = online
                ? await generateCandidateWithOpenAI({ plan, prompt, aiConfig: input.aiConfig, model, userId: input.userId })
                : createOfflineCandidate(plan);

            return build(candidate, online ? model : "offline-variety");
        } catch (error) {
            logger.warn("[QuoteService] Candidate generation failed", {
                lane: plan.lane,
                model,
                error: error instanceof Error ? error.message : "unknown"
            });

            if (model !== input.aiConfig.fallbackModel && online) {
                try {
                    const candidate = await generateCandidateWithOpenAI({
                        plan,
                        prompt,
                        aiConfig: input.aiConfig,
                        model: input.aiConfig.fallbackModel,
                        userId: input.userId
                    });
                    return build(candidate, input.aiConfig.fallbackModel);
                } catch (fallbackError) {
                    logger.warn("[QuoteService] Fallback generation failed", {
                        lane: plan.lane,
                        model: input.aiConfig.fallbackModel,
                        error: fallbackError instanceof Error ? fallbackError.message : "unknown"
                    });
                    return null;
                }
            }

            return null;
        }
    }));

    return attempts.filter((candidate): candidate is GeneratedCandidate => candidate !== null);
}

/**
 * Editorial judge: a small model ranks the candidates on clarity, impact and fit.
 * The result is blended with the local novelty score. Failures degrade to the local score.
 */
async function judgeCandidates(input: {
    candidates: GeneratedCandidate[];
    date: string;
    plan: InspirationPlan;
    interests: string[];
    recentQuotes: RecentQuoteForScoring[];
    profile: TasteProfile | null;
    aiConfig: ResolvedAIConfig;
    userId: string;
}): Promise<GeneratedCandidate[]> {
    if (input.candidates.length < 2 || !isOpenAIConfigured()) {
        return input.candidates;
    }

    const candidateBlock = input.candidates
        .map((entry, index) => [
            `Kandidat ${index}:`,
            `- headline: ${entry.candidate.headline}`,
            `- content: ${entry.candidate.content}`,
            `- explanation: ${entry.candidate.explanation}`,
            `- microAction: ${entry.candidate.microAction}`,
            `- plan: ${entry.plan.lane} / ${entry.candidate.format} / ${entry.candidate.tone} / ${entry.candidate.imageryWorld}`
        ].join("\n"))
        .join("\n\n");

    const prompt = `Du bist Chefredakteur eines Abreißkalenders. Wähle das beste Blatt für ${input.date}.
Format: ${input.plan.mode}, Kategorie: ${input.plan.category}, Interessen: ${input.interests.join(", ") || "unbekannt"}.
Wochentag-Färbung: ${input.plan.dayFlavor}

Bewerte jeden Kandidaten von 0 bis 10:
- clarity: Sofort verständlich beim ersten Lesen, ohne Vorwissen. Konkret statt abstrakt, kein Jargon, kein Metaphern-Gestrüpp.
- impact: Überrascht, bleibt hängen, löst einen Gedanken oder einen kleinen Schritt aus. Nicht austauschbar, kein Kalenderspruch-Allgemeinplatz.
- fit: Passt zu Interessen und Nutzerprofil, wiederholt keinen der letzten Einträge, headline und microAction passen zum content.
Bestrafe Klischees, Nebelsprache, Wiederholungen. Belohne einfache Wörter mit klarer Wendung.

${tasteProfilePromptBlock(input.profile)}

Letzte Einträge (nicht wiederholen):
${recentContentBlock(input.recentQuotes.slice(0, 6))}

${candidateBlock}

Gib für jeden Kandidaten genau eine Bewertung zurück (index 0 bis ${input.candidates.length - 1}).`;

    try {
        const verdict = await structuredCompletion({
            model: input.aiConfig.judgeModel,
            system: "Du bewertest Kalenderblätter streng, fair und knapp. Antworte ausschließlich als JSON nach Schema.",
            user: prompt,
            schema: JudgeVerdictSchema,
            responseFormat: judgeResponseFormat,
            reasoningEffort: "low",
            seed: `${input.plan.seed}:judge`,
            cacheKey: `${PROMPT_VERSION}:judge`,
            safetyIdentifier: seedToNumber(input.userId).toString(16),
            timeoutMs: 40_000
        });

        const byIndex = new Map<number, JudgeResult>();
        for (const evaluation of verdict.evaluations) {
            if (evaluation.index < 0 || evaluation.index >= input.candidates.length) continue;
            const score = (evaluation.clarity * 0.4 + evaluation.impact * 0.4 + evaluation.fit * 0.2) / 10;
            byIndex.set(evaluation.index, {
                clarity: evaluation.clarity,
                impact: evaluation.impact,
                fit: evaluation.fit,
                comment: evaluation.comment,
                score: Number(Math.max(0, Math.min(1, score)).toFixed(4))
            });
        }

        return input.candidates.map((entry, index) => {
            const judge = byIndex.get(index) ?? null;
            const finalScore = judge
                ? Number(((1 - JUDGE_WEIGHT) * entry.score.score + JUDGE_WEIGHT * judge.score).toFixed(4))
                : entry.score.score;
            return { ...entry, judge, finalScore };
        });
    } catch (error) {
        logger.warn("[QuoteService] Judge failed, using local scoring only", {
            model: input.aiConfig.judgeModel,
            error: error instanceof Error ? error.message : "unknown"
        });
        return input.candidates;
    }
}

function chooseWinner(candidates: GeneratedCandidate[]): GeneratedCandidate {
    const winner = candidates
        .slice()
        .sort((a, b) => b.finalScore - a.finalScore || b.score.score - a.score.score)[0];

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
    const profile = user ? await ensureFreshTasteProfile(user) : null;
    const recentQuotes = await getRecentQuotes(userId, date);
    const historyData = await HistoryCompressor.calculateUserHistoryCode(userId, interests);
    const basePlan = buildInspirationPlan({
        userId,
        date,
        interests,
        modeWeights: aiConfig.modeWeights,
        recentSignals: recentSignalsFromQuotes(recentQuotes),
        preferences: planPreferencesFromProfile(profile)
    });
    const plans = buildCandidatePlans(basePlan, aiConfig.candidateCount);

    return {
        user,
        prefs,
        interests,
        aiConfig,
        profile,
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
        profile: context.profile,
        prompt: composeCandidatePrompt({
            plan,
            interests: context.interests,
            historyData: context.historyData,
            recentQuotes: context.recentQuotes,
            masterPrompt: context.aiConfig.masterPrompt,
            profile: context.profile
        })
    };
}

async function loadUserVerdict(userId: string, quoteId: number): Promise<RatingVerdict | null> {
    const rating = await prisma.rating.findFirst({
        where: { userId, quoteId },
        select: { score: true }
    });

    return rating ? verdictFromScore(rating.score) : null;
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
        const userRating = await loadUserVerdict(userId, history.quoteId);
        return {
            ...history.quote,
            isNew: false,
            isLiked: userRating === "up",
            userRating
        };
    }

    logger.info(`[QuoteService] Generating daily inspiration for user ${userId} on ${today}`);

    const context = await buildGenerationContext(userId, today);
    const rawCandidates = await generateCandidates({
        userId,
        plans: context.plans,
        interests: context.interests,
        historyData: context.historyData,
        recentQuotes: context.recentQuotes,
        aiConfig: context.aiConfig,
        profile: context.profile
    });
    const candidates = await judgeCandidates({
        candidates: rawCandidates,
        date: today,
        plan: context.basePlan,
        interests: context.interests,
        recentQuotes: context.recentQuotes,
        profile: context.profile,
        aiConfig: context.aiConfig,
        userId
    });
    const winner = chooseWinner(candidates);
    const generationTrace = JSON.stringify({
        promptVersion: PROMPT_VERSION,
        date: today,
        dayFlavor: context.basePlan.dayFlavor,
        selectedLane: winner.plan.lane,
        selectedScore: winner.score,
        selectedJudge: winner.judge,
        finalScore: winner.finalScore,
        judgeModel: winner.judge ? context.aiConfig.judgeModel : null,
        profile: context.profile
            ? {
                ratingsCount: context.profile.ratingsCount,
                upCount: context.profile.upCount,
                downCount: context.profile.downCount,
                updatedAt: context.profile.updatedAt
            }
            : null,
        candidates: candidates.map((candidate) => ({
            lane: candidate.plan.lane,
            model: candidate.sourceModel,
            score: candidate.score.score,
            judge: candidate.judge?.score ?? null,
            finalScore: candidate.finalScore,
            reasons: candidate.score.reasons
        }))
    });
    const conceptsStr = JSON.stringify(winner.candidate.concepts || []);

    const quote = await prisma.quote.create({
        data: {
            content: winner.candidate.content,
            author: winner.candidate.author,
            explanation: winner.candidate.explanation,
            headline: winner.candidate.headline,
            microAction: winner.candidate.microAction,
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
            provider: isOpenAIConfigured() ? "openai" : "offline",
            noveltyScore: winner.finalScore,
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
                const userRating = await loadUserVerdict(userId, winnerView.quoteId);
                return {
                    ...winnerView.quote,
                    isNew: false,
                    isLiked: userRating === "up",
                    userRating
                };
            }
        }

        logger.error("[QuoteService] Error creating dailyView:", error);
    }

    return { ...quote, isNew: true, isLiked: false, userRating: null as RatingVerdict | null };
}
