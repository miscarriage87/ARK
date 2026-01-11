/**
 * Zentrale Konstanten für die dArk App
 */

// App-Version (aus package.json, nur Major.Minor)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fullVersion: string = require('../../package.json').version;
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
    "Spiritualität",
    "Mut"
] as unknown as Interest[];

// AI Modus-Typen
export const AI_MODES = ["QUOTE", "QUESTION", "PULSE"] as const;
export type AIMode = typeof AI_MODES[number];

// Maximale Anzahl auswählbarer Interessen
export const MAX_INTERESTS = 3;
