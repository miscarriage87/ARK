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
 * Formatiert ein Datum als "YYYY-MM-DD"
 */
export function formatDateString(date: Date = new Date()): string {
    return date.toISOString().split("T")[0];
}

/**
 * Formats a date in the app's product timezone instead of UTC.
 * This keeps the daily calendar aligned with the user's expected local day.
 */
export function formatAppDate(date: Date = new Date()): string {
    const timeZone = process.env.APP_TIME_ZONE || "Europe/Berlin";
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(date);

    const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${byType.year}-${byType.month}-${byType.day}`;
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
