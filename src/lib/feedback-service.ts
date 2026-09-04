import { prisma } from "./prisma";
import { resolveAiConfig } from "./ai-config";
import { isOpenAIConfigured, structuredCompletion } from "./openai-client";
import { TasteSummarySchema, tasteSummaryResponseFormat } from "./quote-output";
import {
    AXIS_LABELS,
    MIN_RATINGS_FOR_SUMMARY,
    buildTasteProfile,
    parseTasteProfile,
    strongestPreferences,
    verdictFromScore,
    type RatedQuoteSignal,
    type TasteProfile,
    type TasteProfileSummary
} from "./taste-profile";
import { logger, safeJsonParse } from "./utils";

/**
 * Feedback service: turns thumbs up/down ratings into a persisted taste profile.
 *
 * - `refreshTasteProfile` recomputes axis statistics and (with >= 3 ratings) asks a small
 *   model for a short German summary + writing guidance.
 * - `ensureFreshTasteProfile` is used by the generator: it refreshes lazily when new
 *   ratings arrived since the last profile build.
 */

const PROFILE_PROMPT_VERSION = "ark-taste-v1";

export async function loadRatedQuoteSignals(userId: string): Promise<RatedQuoteSignal[]> {
    const ratings = await prisma.rating.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 200,
        include: {
            quote: {
                select: {
                    content: true,
                    headline: true,
                    mode: true,
                    category: true,
                    format: true,
                    tone: true,
                    imageryWorld: true,
                    rhetoricalDevice: true,
                    perspective: true,
                    timeHorizon: true,
                    actionType: true,
                    difficulty: true
                }
            }
        }
    });

    return ratings.map((rating) => ({
        verdict: verdictFromScore(rating.score),
        content: rating.quote.content,
        headline: rating.quote.headline,
        mode: rating.quote.mode,
        category: rating.quote.category,
        format: rating.quote.format,
        tone: rating.quote.tone,
        imageryWorld: rating.quote.imageryWorld,
        rhetoricalDevice: rating.quote.rhetoricalDevice,
        perspective: rating.quote.perspective,
        timeHorizon: rating.quote.timeHorizon,
        actionType: rating.quote.actionType,
        difficulty: rating.quote.difficulty
    }));
}

function describeSignal(signal: RatedQuoteSignal): string {
    const meta = [signal.mode, signal.category, signal.format, signal.tone, signal.imageryWorld]
        .filter(Boolean)
        .join(" / ");
    const headline = signal.headline ? `${signal.headline}: ` : "";
    return `- ${signal.verdict === "up" ? "👍" : "👎"} [${meta || "ohne Metadaten"}] ${headline}${signal.content}`;
}

async function summarizeTaste(input: {
    signals: RatedQuoteSignal[];
    interests: string[];
    model: string;
    userId: string;
}): Promise<TasteProfileSummary | null> {
    if (!isOpenAIConfigured()) return null;

    const draft = buildTasteProfile(input.signals);
    const liked = strongestPreferences(draft, "up", 6, 0.2);
    const disliked = strongestPreferences(draft, "down", 6, 0.2);
    const describe = (items: typeof liked) => items
        .map((item) => `${AXIS_LABELS[item.axis]}=${item.value} (${item.up}👍/${item.down}👎)`)
        .join(", ") || "keine klare Tendenz";

    const prompt = `Interessen des Nutzers: ${input.interests.join(", ") || "unbekannt"}

Bewertete Kalenderblätter (neueste zuerst, 👍 = gut, 👎 = schlecht):
${input.signals.slice(0, 40).map(describeSignal).join("\n")}

Statistik über Achsen:
- Kommt gut an: ${describe(liked)}
- Kommt schlecht an: ${describe(disliked)}

Aufgabe: Beschreibe knapp und konkret den Geschmack dieser Person für Kalenderblätter.
- summary: 2-3 Sätze. Was kommt an (Ton, Bildwelten, Form, Länge, Denkbewegung), was nicht.
- guidance: bis zu 4 konkrete Schreibregeln für zukünftige Blätter ("Bevorzuge ...", "Vermeide ...").
- preferPatterns / avoidPatterns: je bis zu 5 kurze Stichworte.
Keine Aussagen über die Person selbst, nur über Stil und Inhalt. Antworte auf Deutsch.`;

    try {
        const summary = await structuredCompletion({
            model: input.model,
            system: "Du analysierst Bewertungen zu Kalenderblättern und leitest daraus präzise, nüchterne Schreibregeln ab. Antworte ausschließlich als JSON nach Schema.",
            user: prompt,
            schema: TasteSummarySchema,
            responseFormat: tasteSummaryResponseFormat,
            reasoningEffort: "low",
            cacheKey: PROFILE_PROMPT_VERSION,
            safetyIdentifier: input.userId,
            timeoutMs: 40_000
        });

        return { ...summary, model: input.model };
    } catch (error) {
        logger.warn("[TasteProfile] LLM summary failed, keeping statistics only", {
            error: error instanceof Error ? error.message : "unknown"
        });
        return null;
    }
}

export async function refreshTasteProfile(userId: string, options: { withLlm?: boolean } = {}): Promise<TasteProfile | null> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, preferences: true, aiConfig: true, tasteProfile: true }
    });
    if (!user) return null;

    const signals = await loadRatedQuoteSignals(userId);
    if (signals.length === 0) {
        if (user.tasteProfile) {
            await prisma.user.update({
                where: { id: userId },
                data: { tasteProfile: null, tasteProfileUpdatedAt: new Date() }
            });
        }
        return null;
    }

    const previous = parseTasteProfile(user.tasteProfile);
    let summary = previous?.summary ?? null;

    const useLlm = options.withLlm !== false && signals.length >= MIN_RATINGS_FOR_SUMMARY;
    if (useLlm) {
        const prefs = safeJsonParse<{ interests?: string[] }>(user.preferences, {});
        const aiConfig = resolveAiConfig(user.aiConfig);
        summary = (await summarizeTaste({
            signals,
            interests: Array.isArray(prefs.interests) ? prefs.interests : [],
            model: aiConfig.profileModel,
            userId
        })) ?? summary;
    }

    const profile = buildTasteProfile(signals, summary);

    await prisma.user.update({
        where: { id: userId },
        data: {
            tasteProfile: JSON.stringify(profile),
            tasteProfileUpdatedAt: new Date()
        }
    });

    logger.info(`[TasteProfile] Refreshed profile for ${userId}: ${profile.upCount} up / ${profile.downCount} down`);
    return profile;
}

/** Fire-and-forget refresh after a rating; errors are logged, never thrown. */
export function scheduleTasteProfileRefresh(userId: string): void {
    void refreshTasteProfile(userId).catch((error) => {
        logger.warn("[TasteProfile] Background refresh failed", {
            userId,
            error: error instanceof Error ? error.message : "unknown"
        });
    });
}

/**
 * Returns the stored profile, rebuilding it first when ratings are newer than the profile.
 * Called from the generation context so legacy ratings (hearts) are picked up automatically.
 */
export async function ensureFreshTasteProfile(user: {
    id: string;
    tasteProfile: string | null;
    tasteProfileUpdatedAt: Date | null;
}): Promise<TasteProfile | null> {
    const latestRating = await prisma.rating.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true }
    });

    if (!latestRating) return null;

    const existing = parseTasteProfile(user.tasteProfile);
    if (existing && user.tasteProfileUpdatedAt && user.tasteProfileUpdatedAt >= latestRating.createdAt) {
        return existing;
    }

    try {
        return await refreshTasteProfile(user.id);
    } catch (error) {
        logger.warn("[TasteProfile] Lazy refresh failed, using stored profile", {
            userId: user.id,
            error: error instanceof Error ? error.message : "unknown"
        });
        return existing;
    }
}
