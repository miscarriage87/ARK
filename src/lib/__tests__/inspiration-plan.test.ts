import { describe, expect, it } from "vitest";
import {
    applyModePreferences,
    buildCandidatePlans,
    buildInspirationPlan,
    dayFlavorForDate,
    VARIETY_AXES
} from "../inspiration-plan";

const baseInput = {
    userId: "445297ed-9d86-43a0-b334-b16c7c7ee418",
    date: "2026-09-05",
    interests: ["Stoizismus", "Wissenschaft"],
    modeWeights: { quote: 50, question: 30, pulse: 20 }
};

describe("buildInspirationPlan", () => {
    it("is deterministic for the same user and date", () => {
        const first = buildInspirationPlan(baseInput);
        const second = buildInspirationPlan(baseInput);
        expect(second).toEqual(first);
    });

    it("changes the seed when the date changes", () => {
        const today = buildInspirationPlan(baseInput);
        const tomorrow = buildInspirationPlan({ ...baseInput, date: "2026-09-06" });
        expect(tomorrow.seed).not.toEqual(today.seed);
    });

    it("prefers a liked format and avoids a disliked one", () => {
        const liked = buildInspirationPlan({
            ...baseInput,
            modeWeights: { quote: 100, question: 0, pulse: 0 },
            preferences: { format: { aphorism: 1 } }
        });
        expect(liked.format).toBe("aphorism");

        const disliked = buildInspirationPlan({
            ...baseInput,
            modeWeights: { quote: 100, question: 0, pulse: 0 },
            preferences: { format: { [liked.format]: -1 } }
        });
        expect(disliked.format).not.toBe("aphorism");
    });

    it("lets a disliked value return once every alternative is more stale", () => {
        const recentSignals = VARIETY_AXES.tones
            .filter((tone) => tone !== "poetic")
            .map((tone) => ({ tone }));

        const plan = buildInspirationPlan({
            ...baseInput,
            recentSignals,
            preferences: { tone: { poetic: -0.5 } }
        });

        expect(plan.tone).toBe("poetic");
    });

    it("assigns a weekday flavour", () => {
        expect(dayFlavorForDate("2026-09-06")).toMatch(/^Sonntag/);
        expect(dayFlavorForDate("2026-09-07")).toMatch(/^Montag/);
        expect(buildInspirationPlan(baseInput).dayFlavor).toMatch(/^Samstag/);
    });

    it("builds candidate plans with distinct lanes", () => {
        const plans = buildCandidatePlans(buildInspirationPlan(baseInput), 3);
        expect(new Set(plans.map((plan) => plan.lane)).size).toBe(3);
        expect(new Set(plans.map((plan) => plan.seed)).size).toBe(3);
    });
});

describe("applyModePreferences", () => {
    it("lowers the weight of a disliked mode and keeps a floor", () => {
        const weights = applyModePreferences(
            { quote: 50, question: 30, pulse: 20 },
            { mode: { QUESTION: -1, QUOTE: 0.5 } }
        );
        expect(weights.question).toBeLessThan(30);
        expect(weights.question).toBeGreaterThan(0);
        expect(weights.quote).toBeGreaterThan(50);
        expect(weights.pulse).toBe(20);
    });
});
