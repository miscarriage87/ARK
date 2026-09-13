/**
 * Utility-Funktionen für die dArk App
 */

/**
 * Sicheres JSON-Parsing mit Fallback-Wert
 * Vermeidet try-catch Duplikation in der gesamten Codebase
 */
export function safeJsonParse<T>(
    json: string | null | undefined,
    fallback: T
): T {
    if (!json) return fallback;

    try {
        return JSON.parse(json) as T;
    } catch (error) {
        console.warn("[safeJsonParse] Failed to parse JSON:", error);
        return fallback;
    }
}

/**
 * Validiert ob ein String ein gültiges UUID-Format hat
 */
export function isValidUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
}

/**
 * Formats a date as "YYYY-MM-DD" in the browser's local timezone (client-safe, no env access).
 */
export function formatLocalDate(date: Date = new Date()): string {
    const parts = new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(date);

    const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${byType.year}-${byType.month}-${byType.day}`;
}

/**
 * Formats a date in the app's product timezone instead of UTC.
 * Optional offsets count calendar days in that timezone, independently of the
 * server's timezone and 23/25-hour days at daylight-saving transitions.
 */
export function formatAppDate(date: Date = new Date(), dayOffset: number = 0): string {
    if (!Number.isInteger(dayOffset)) {
        throw new RangeError("dayOffset must be an integer");
    }

    const timeZone = process.env.APP_TIME_ZONE || "Europe/Berlin";
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(date);

    const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    if (dayOffset === 0) return `${byType.year}-${byType.month}-${byType.day}`;

    // These UTC fields represent a calendar date, not the original instant.
    // UTC arithmetic then rolls months/years without applying host DST rules.
    const calendarDate = new Date(0);
    calendarDate.setUTCFullYear(Number(byType.year), Number(byType.month) - 1, Number(byType.day) + dayOffset);
    const year = String(calendarDate.getUTCFullYear()).padStart(4, "0");
    const month = String(calendarDate.getUTCMonth() + 1).padStart(2, "0");
    const day = String(calendarDate.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}

/**
 * Logger mit Environment-Check
 * Unterdrückt Debug-Logs in Production
 */
export const logger = {
    debug: (...args: unknown[]) => {
        if (process.env.NODE_ENV === "development") {
            console.log("[DEBUG]", ...args);
        }
    },
    info: (...args: unknown[]) => {
        console.info("[INFO]", ...args);
    },
    warn: (...args: unknown[]) => {
        console.warn("[WARN]", ...args);
    },
    error: (...args: unknown[]) => {
        console.error("[ERROR]", ...args);
    }
};
