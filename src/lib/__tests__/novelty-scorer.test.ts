import { describe, expect, it } from "vitest";
import { impactScore, readabilityScore, scoreQuoteCandidate, type RecentQuoteForScoring } from "../novelty-scorer";
import { buildInspirationPlan } from "../inspiration-plan";
import type { QuoteCandidate } from "../quote-output";

const plan = buildInspirationPlan({
    userId: "445297ed-9d86-43a0-b334-b16c7c7ee418",
    date: "2026-09-05",
    interests: ["Stoizismus"],
    modeWeights: { quote: 100, question: 0, pulse: 0 }
});

function candidate(content: string, overrides: Partial<QuoteCandidate> = {}): QuoteCandidate {
    return {
        headline: "Der leere Stuhl",
        content,
        author: "Einsicht",
        explanation: "Der Satz meint: Was du weglässt, gibt dem Rest Gewicht. Heute hilft das beim Aufräumen des Tages.",
        microAction: "Streich heute einen Termin, der nur aus Gewohnheit steht.",
        category: "Stoizismus",
        concepts: [],
        format: plan.format,
        tone: plan.tone,
        imageryWorld: plan.imageryWorld,
        rhetoricalDevice: plan.rhetoricalDevice,
        ...overrides
    };
}

function recent(content: string): RecentQuoteForScoring {
    return {
        content,
        headline: null,
        format: null,
        perspective: null,
        tone: null,
        imageryWorld: null,
        rhetoricalDevice: null,
        timeHorizon: null,
        actionType: null,
        difficulty: null,
        category: null
    };
}

describe("readabilityScore", () => {
    it("rewards short, plain sentences", () => {
        expect(readabilityScore("Ein leerer Stuhl am Tisch sagt mehr als drei volle.").score).toBeGreaterThan(0.85);
    });

    it("penalises long, nominal, comma-heavy sentences", () => {
        const convoluted = "Die Selbstverwirklichungsbestrebung, welche sich, sofern man die Rahmenbedingungen berücksichtigt, in der Verantwortungsübernahme manifestiert, erfordert Entschlossenheit, Beharrlichkeit und Gelassenheit.";
        expect(readabilityScore(convoluted).score).toBeLessThan(0.5);
    });
});

describe("impactScore", () => {
    it("penalises a question mode without a question mark", () => {
        const withMark = impactScore("Welchen Stuhl am Tisch räumst du heute frei?", "QUESTION").score;
        const withoutMark = impactScore("Welchen Stuhl am Tisch räumst du heute frei.", "QUESTION").score;
        expect(withMark).toBeGreaterThan(withoutMark);
    });
});

describe("scoreQuoteCandidate", () => {
    it("prefers fresh content over a near duplicate of recent history", () => {
        const history = [recent("Ein leerer Stuhl am Tisch sagt mehr als drei volle Stühle.")];
        const duplicate = scoreQuoteCandidate({ candidate: candidate("Ein leerer Stuhl am Tisch sagt mehr als drei volle Stühle."), plan, recentQuotes: history });
        const fresh = scoreQuoteCandidate({ candidate: candidate("Wer das Werkzeug wegräumt, sieht zuerst, was er wirklich braucht."), plan, recentQuotes: history });
        expect(fresh.score).toBeGreaterThan(duplicate.score);
        expect(duplicate.maxSimilarity).toBeGreaterThan(0.5);
    });

    it("penalises clichés", () => {
        const plain = scoreQuoteCandidate({ candidate: candidate("Wer das Werkzeug wegräumt, sieht zuerst, was er wirklich braucht."), plan, recentQuotes: [] });
        const cliche = scoreQuoteCandidate({ candidate: candidate("Lass los und tauch ein in das Hier und Jetzt des Universums."), plan, recentQuotes: [] });
        expect(plain.score).toBeGreaterThan(cliche.score);
        expect(cliche.reasons.some((reason) => reason.startsWith("cliche:"))).toBe(true);
    });

    it("uses the taste profile as a fit signal", () => {
        const profile = {
            version: 1,
            updatedAt: new Date().toISOString(),
            ratingsCount: 4,
            upCount: 3,
            downCount: 1,
            axes: { tone: [{ value: plan.tone, score: -0.75, up: 0, down: 3 }] },
            likedExamples: [],
            dislikedExamples: [],
            summary: null
        };
        const neutral = scoreQuoteCandidate({ candidate: candidate("Wer das Werkzeug wegräumt, sieht zuerst, was er wirklich braucht."), plan, recentQuotes: [] });
        const disliked = scoreQuoteCandidate({ candidate: candidate("Wer das Werkzeug wegräumt, sieht zuerst, was er wirklich braucht."), plan, recentQuotes: [], profile });
        expect(disliked.feedbackFit).toBeLessThan(0);
        expect(disliked.score).toBeLessThan(neutral.score);
    });
});
