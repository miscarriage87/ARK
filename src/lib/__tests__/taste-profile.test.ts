import { describe, expect, it } from "vitest";
import {
    buildTasteProfile,
    computeAxisPreferences,
    feedbackFit,
    parseTasteProfile,
    planPreferencesFromProfile,
    tasteProfilePromptBlock,
    verdictFromScore,
    type RatedQuoteSignal
} from "../taste-profile";

const signals: RatedQuoteSignal[] = [
    { verdict: "up", content: "Ein leerer Stuhl am Tisch sagt mehr als drei volle.", tone: "poetic", format: "aphorism", mode: "QUOTE" },
    { verdict: "up", content: "Wer das Werkzeug wegräumt, sieht, was er braucht.", tone: "poetic", format: "field-note", mode: "QUOTE" },
    { verdict: "down", content: "Welche Ausrede kostet dich heute am meisten?", tone: "provocative", format: "threshold-question", mode: "QUESTION" },
    { verdict: "down", content: "Was hält dich davon ab, heute anzufangen?", tone: "provocative", format: "threshold-question", mode: "QUESTION" }
];

describe("computeAxisPreferences", () => {
    it("aggregates up and down votes per axis value with smoothing", () => {
        const prefs = computeAxisPreferences(signals);
        const poetic = prefs.tone?.find((entry) => entry.value === "poetic");
        const provocative = prefs.tone?.find((entry) => entry.value === "provocative");

        expect(poetic).toMatchObject({ up: 2, down: 0 });
        expect(poetic?.score).toBeCloseTo(2 / 3, 3);
        expect(provocative).toMatchObject({ up: 0, down: 2 });
        expect(provocative?.score).toBeCloseTo(-2 / 3, 3);
        expect(prefs.length?.length).toBeGreaterThan(0);
    });
});

describe("buildTasteProfile / parseTasteProfile", () => {
    it("round-trips through JSON", () => {
        const profile = buildTasteProfile(signals);
        const parsed = parseTasteProfile(JSON.stringify(profile));

        expect(parsed).not.toBeNull();
        expect(parsed?.ratingsCount).toBe(4);
        expect(parsed?.upCount).toBe(2);
        expect(parsed?.likedExamples).toHaveLength(2);
        expect(parsed?.dislikedExamples).toHaveLength(2);
    });

    it("rejects malformed or foreign JSON", () => {
        expect(parseTasteProfile(null)).toBeNull();
        expect(parseTasteProfile("not json")).toBeNull();
        expect(parseTasteProfile(JSON.stringify({ version: 99 }))).toBeNull();
    });
});

describe("feedbackFit", () => {
    const profile = buildTasteProfile(signals);

    it("is positive for liked axes and negative for disliked ones", () => {
        const liked = feedbackFit(profile, { content: "Ein Hammer auf der Werkbank wartet nicht auf Motivation.", tone: "poetic", mode: "QUOTE" });
        const disliked = feedbackFit(profile, { content: "Ein Hammer auf der Werkbank wartet nicht auf Motivation.", tone: "provocative", mode: "QUESTION" });
        expect(liked.fit).toBeGreaterThan(0);
        expect(disliked.fit).toBeLessThan(0);
    });

    it("penalises content that resembles a disliked example", () => {
        const similar = feedbackFit(profile, { content: "Was hält dich davon ab, heute anzufangen?" });
        expect(similar.fit).toBeLessThan(0);
        expect(similar.reasons.some((reason) => reason.startsWith("similar-to-disliked"))).toBe(true);
    });

    it("is neutral without a profile", () => {
        expect(feedbackFit(null, { content: "x" })).toEqual({ fit: 0, reasons: [] });
    });
});

describe("prompt and planner helpers", () => {
    it("explains the empty state", () => {
        expect(tasteProfilePromptBlock(null)).toContain("Noch keine Bewertungen");
    });

    it("lists liked and disliked axes for the prompt", () => {
        const block = tasteProfilePromptBlock(buildTasteProfile(signals));
        expect(block).toContain("4 Bewertungen gelernt");
        expect(block).toContain("Ton=poetic");
        expect(block).toContain("Ton=provocative");
        expect(block).toContain("Kompass");
    });

    it("exposes confidence-weighted preferences for the planner", () => {
        const prefs = planPreferencesFromProfile(buildTasteProfile(signals));
        expect(prefs.tone?.poetic).toBeGreaterThan(0);
        expect(prefs.tone?.provocative).toBeLessThan(0);
        expect(prefs.length).toBeDefined();
    });

    it("maps legacy heart ratings to verdicts", () => {
        expect(verdictFromScore(5)).toBe("up");
        expect(verdictFromScore(4)).toBe("up");
        expect(verdictFromScore(1)).toBe("down");
    });
});
