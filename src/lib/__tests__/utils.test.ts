import { afterEach, describe, expect, it, vi } from "vitest";
import { formatAppDate } from "../utils";

afterEach(() => {
    vi.unstubAllEnvs();
});

describe.each(["UTC", "America/Los_Angeles", "Europe/Berlin"])("app calendar dates on a %s host", (hostZone) => {
    it.each([
        ["2026-03-28T22:30:00Z", 1, "2026-03-29"],
        ["2026-10-24T22:30:00Z", 1, "2026-10-26"],
        ["2026-03-29T22:30:00Z", -1, "2026-03-29"],
        ["2026-10-25T22:30:00Z", -1, "2026-10-24"],
        ["2028-02-28T12:00:00Z", 1, "2028-02-29"],
        ["2028-02-29T12:00:00Z", 1, "2028-03-01"],
        ["2026-12-31T12:00:00Z", 1, "2027-01-01"],
        ["2027-01-01T12:00:00Z", -1, "2026-12-31"],
        ["2026-03-28T23:30:00Z", 0, "2026-03-29"]
    ])("offsets %s by %i calendar days to %s", (instant, offset, expected) => {
        vi.stubEnv("TZ", hostZone);
        vi.stubEnv("APP_TIME_ZONE", "Europe/Berlin");
        const date = new Date(instant);

        expect(formatAppDate(date, offset)).toBe(expected);
        expect(date.toISOString()).toBe(instant.replace("Z", ".000Z"));
    });
});

describe("app timezone configuration", () => {
    it.each([1.5, NaN, Infinity])("rejects a non-integer offset of %s", (offset) => {
        expect(() => formatAppDate(new Date(), offset)).toThrow(RangeError);
    });

    it("keeps the default date-only call aligned with Berlin", () => {
        vi.stubEnv("APP_TIME_ZONE", "");
        expect(formatAppDate(new Date("2026-03-28T23:30:00Z"))).toBe("2026-03-29");
    });

    it("uses the configured product day before applying the offset", () => {
        vi.stubEnv("APP_TIME_ZONE", "America/New_York");
        vi.stubEnv("TZ", "UTC");
        expect(formatAppDate(new Date("2026-03-08T04:30:00Z"), 1)).toBe("2026-03-08");
        expect(formatAppDate(new Date("2026-11-01T04:30:00Z"), 1)).toBe("2026-11-02");
    });
});
