/**
 * Zentrale Konstanten für die dArk App
 */

import packageJson from "../../package.json";

// App-Version (aus package.json, nur Major.Minor)
const fullVersion: string = packageJson.version;
export const APP_VERSION = `v${fullVersion.split('.').slice(0, 2).join('.')}`;

// Verfügbare Interessen-Kategorien für Onboarding und Settings
export const INTERESTS = [
    "Achtsamkeit",
    "Spiritualität",
    "Stoizismus",
    "Unternehmertum",
    "Wissenschaft",
    "Kunst",
    "Poesie",
    "Führung",
    "Wellness"
] as const;

export type Interest = typeof INTERESTS[number];

// Fallback-Interessen wenn User keine ausgewählt hat
export const FALLBACK_INTERESTS: Interest[] = [
    "Achtsamkeit",
    "Stoizismus",
    "Wissenschaft"
];

// AI Modus-Typen
export const AI_MODES = ["QUOTE", "QUESTION", "PULSE"] as const;
export type AIMode = typeof AI_MODES[number];

// Maximale Anzahl auswählbarer Interessen
export const MAX_INTERESTS = 3;

// Date from which DailyView engagement tracking (opened / revealed) exists.
// Older rows have no tracking data and must not be shown as "unopened".
export const VIEW_TRACKING_SINCE = "2026-09-05";
