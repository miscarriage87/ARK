/**
 * Zentrale Typen-Definitionen für die dArk App
 */

import { Interest } from "./constants";

// User Preferences (gespeichert als JSON in DB)
export interface UserPreferences {
    interests?: Interest[];
}

// AI Konfiguration (gespeichert als JSON in DB)
export interface AIConfig {
    temperature?: number;
    modeWeights?: {
        quote: number;
        question: number;
        pulse: number;
    };
    masterPrompt?: string;
    model?: string;
}

// Quote-Daten aus der Datenbank
export interface Quote {
    id: number;
    content: string;
    author: string | null;
    explanation: string | null;
    category: string | null;
    tags: string | null;
    concepts: string | null;
    generatedAt: Date;
    sourceModel: string | null;
}

// Quote-Daten mit zusätzlichen Runtime-Informationen
export interface QuoteWithMeta extends Quote {
    isNew: boolean;
    isLiked: boolean;
}

// Concept-Definition (Teil von Quote.concepts JSON)
export interface Concept {
    word: string;
    definition: string;
}

// User-Daten aus der Datenbank
export interface User {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    name: string;
    onboardingCompleted: boolean;
    preferences: string | null;
    aiConfig: string | null;
}

// User mit geparsten Preferences für Client-Komponenten
export interface UserWithParsedPrefs {
    id: string;
    name: string;
    interests: Interest[];
    onboardingCompleted: boolean;
    createdAt: Date;
    preferences: string | null;
}

// DailyView aus der Datenbank
export interface DailyView {
    id: number;
    userId: string;
    quoteId: number;
    viewedAt: Date;
    date: string;
    quote?: Quote;
}

// Rating aus der Datenbank
export interface Rating {
    id: number;
    userId: string;
    quoteId: number;
    score: number;
    createdAt: Date;
    quote?: Quote;
}

// API Response Typen
export interface ApiSuccessResponse<T> {
    success: true;
    data: T;
}

export interface ApiErrorResponse {
    success: false;
    error: string;
    code?: string;
    details?: unknown;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// Server Action Response für fetchDailyQuoteAction
export interface DailyQuoteActionResponse {
    success: boolean;
    quote?: QuoteWithMeta;
    date?: string;
    error?: string;
}
