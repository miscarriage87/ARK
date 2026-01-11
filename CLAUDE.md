# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**dArk** (interner Name: "Antigravity") ist eine personalisierte Tages-Inspirations-App. Nutzer erhalten täglich KI-generierte Zitate, Reflexionsfragen oder Impulse basierend auf ihren Interessen.

## Commands

```bash
npm run dev          # Entwicklungsserver starten (Next.js)
npm run build        # Produktionsbuild erstellen
npm run lint         # ESLint ausführen
npm run deploy       # Prisma Migrationen ausführen (prisma migrate deploy)
```

### Datenbank
```bash
npx prisma studio    # Datenbank-GUI öffnen
npx prisma generate  # Prisma Client neu generieren (nach schema.prisma Änderungen)
npx prisma migrate dev --name <name>  # Neue Migration erstellen
```

## Architecture

### Tech Stack
- **Next.js 16** (App Router) mit TypeScript
- **SQLite** + Prisma ORM
- **OpenAI API** für Zitat-Generierung
- **CSS Modules** + globale CSS-Variablen (kein Tailwind für Komponenten-Styling)
- **Framer Motion** für Animationen

### Kernkonzept: Tägliches Zitat pro User

Der Hauptfluss (`src/lib/ai-service.ts:getDailyQuote`):
1. Prüft ob User heute bereits ein Zitat gesehen hat (`DailyView` Tabelle)
2. Falls ja: Cached Zitat zurückgeben
3. Falls nein: Neues Zitat via OpenAI generieren mit:
   - Zufälliger Modus-Auswahl (QUOTE/QUESTION/PULSE) basierend auf Gewichtung
   - User-Interessen als Kategorie
   - History-Kompression (`HistoryCompressor`) um Wiederholungen zu vermeiden
   - Kategorie-spezifische Style-Guides für den Prompt

### Datenmodell (prisma/schema.prisma)

- **User**: Profil mit JSON-`preferences` (Interessen) und optionalem `aiConfig` (Admin-Override für Temperatur, Prompt, Model)
- **Quote**: Generierte Inhalte mit `concepts` (JSON-Array erklärbarer Begriffe)
- **DailyView**: Verknüpft User+Quote+Datum (unique constraint auf userId+date)
- **Rating/Share**: Tracking für Likes und Shares

### Routing-Struktur

- `/[username]` - Haupt-Nutzerseite, zeigt Onboarding oder QuoteView
- `/[username]/archive` - Archiv vergangener Zitate
- `/admin` - Login-Seite
- `/admin/dashboard` - User-Verwaltung und AI-Konfiguration pro User
- `/api/quote/daily` - POST für Onboarding, GET für Zitat-Abruf
- `/api/quote/rate` - Bewertungs-Endpoint

### AI-Prompt System (`src/lib/ai-service.ts`)

Exportierte Konstanten für Admin-Sichtbarkeit:
- `CATEGORY_STYLE_GUIDE` - Stilregeln pro Kategorie (Achtsamkeit, Stoizismus, etc.)
- `ARCHETYPES_FOR_MODE` - Archetypenliste pro Modus
- `MODE_INSTRUCTIONS` - Spezifische Instruktionen für QUOTE/QUESTION/PULSE
- `DEFAULT_MASTER_PROMPT` - Haupt-Prompt-Template mit Platzhaltern ({{MODE}}, {{CATEGORY}}, etc.)

Der `HistoryCompressor` (`src/lib/history-compressor.ts`) generiert einen komprimierten Blocklist-String aus vergangenen Autoren und Konzepten, um Wiederholungen zu vermeiden.

## Environment Variables

```
DATABASE_URL="file:./dev.db"
OPENAI_API_KEY="..."
ADMIN_PASSWORD="..."  # Passwort für Admin-Login
```

## Shared Utilities (`src/lib/`)

- **`constants.ts`** - Zentrale Konstanten (INTERESTS, MAX_INTERESTS, AI_MODES)
- **`types.ts`** - TypeScript-Typen (User, Quote, UserPreferences, AIConfig, etc.)
- **`utils.ts`** - Utility-Funktionen:
  - `safeJsonParse<T>()` - Sicheres JSON-Parsing mit Fallback
  - `isValidUUID()` - UUID-Format-Validierung
  - `logger` - Environment-aware Logger (unterdrückt Debug in Production)

## Key Patterns

- **Server Actions** (`src/app/actions.ts`) für serverseitige Zitat-Generierung
- **Client Components** für interaktive UI (QuoteView, Onboarding) mit `"use client"`
- **Admin-Auth** via Cookie-basierter Session mit Session-Token und Rate-Limiting
- **Input-Validierung** via Zod in Admin-API-Routes
- **Race Condition Handling** in `getDailyQuote` bei gleichzeitigen Requests (P2002 Error)

## Nach Schema-Änderungen

```bash
npx prisma migrate dev --name <beschreibung>  # Migration erstellen
npx prisma generate                            # Client regenerieren
```
