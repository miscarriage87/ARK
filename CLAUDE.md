# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**dArk** (internal name: "Antigravity") is a personalized daily inspiration app. Users receive AI-generated quotes, reflection questions, or impulses based on their interests — one per day, cached.

## Commands

```bash
npm run dev          # Start dev server (Next.js)
npm run build        # Production build
npm run start        # Run production server
npm run lint         # ESLint
npm run db:check     # Check database connectivity
npm run db:generate  # Regenerate Prisma client
npm run db:migrate   # Run prisma migrate deploy (production migrations)
```

### Database
```bash
npx prisma studio                        # Database GUI
npx prisma generate                      # Regenerate client (after schema.prisma changes)
npx prisma migrate dev --name <name>     # Create new migration (development)
```

### Utility Scripts
```bash
npx tsx scripts/seed-ai.ts               # Seed DB with test users + 5-day quote history
npx tsx scripts/backfill-date.ts         # Generate a single quote for specific user+date
```

## Architecture

### Tech Stack
- **Next.js 16** (App Router) with TypeScript + React 19
- **SQLite** + Prisma ORM (WAL mode)
- **OpenAI API** (GPT-5.4/GPT-5.5 routes) for candidate generation with Structured Outputs
- **CSS Modules** + global CSS variables for component styling
- **Tailwind CSS** available (in devDependencies) but components use CSS Modules
- **Framer Motion** for animations, **Lucide React** for icons
- **Zod** for input validation in admin API routes

### Core Flow: Daily Quote per User

Entry point: `src/lib/ai-service.ts:getDailyQuote(userId, forcedDate?)`

1. Check `DailyView` table for user+date → return cached quote if exists
2. Fetch user preferences + optional admin AI config override
3. Build a deterministic `InspirationPlan` for the user/date with mode, category, format, tone, imagery world, and rhetorical device
4. Compress history via `HistoryCompressor` → banned authors/concepts blocklist
5. Generate multiple prompt-lane candidates through OpenAI Structured Outputs
6. Score candidates with lexical/history/metadata novelty checks
7. Save the highest-scoring Quote with variety metadata + create DailyView record

**Race condition handling**: Multiple simultaneous requests for same user+date are handled via Prisma P2002 unique constraint error — loser fetches the winner's quote.

### CRON / Background Pregeneration

Two mechanisms ensure quotes are ready before users visit:

1. **Server-side CRON** (`/api/cron/pregenerate`):
   - Called by external scheduler (e.g., daily at 03:00)
   - Secured via `CRON_API_KEY` (header `x-cron-key` or query `?key=`)
   - Responds immediately, runs generation in background (fire-and-forget)
   - Generates tomorrow's quotes for all onboarded users missing one

2. **Client-side trigger** (`/api/quote/pregenerate`):
   - `QuoteView` component triggers after displaying today's quote
   - SessionStorage dedup flag prevents multiple calls per session
   - Generates tomorrow's quote for current user only

### Data Model (prisma/schema.prisma)

- **User**: Profile with JSON `preferences` (interests array) and optional `aiConfig` (admin override for temperature, prompt, model, modeWeights)
- **Quote**: Generated content with `concepts`, `sourceModel`, `category`, variety metadata, prompt version, novelty score, and generation trace
- **DailyView**: Links User+Quote+Date. Unique constraint on `(userId, date)` — core caching mechanism
- **Rating/Share**: Tracking for likes and shares (unique per user+quote)

### Routing Structure

| Route | Purpose |
|-------|---------|
| `/` | Animated landing/intro page |
| `/[username]` | Main user page (SSR) — shows Onboarding or QuoteView |
| `/[username]/archive` | Archive of past quotes |
| `/admin` | Admin login page |
| `/admin/dashboard` | User management + system context |
| `/admin/user/[id]` | Per-user AI config (temperature, prompt, model) |

### API Routes

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/quote/daily` | GET | x-user-id header | Fetch today's quote |
| `/api/quote/daily` | POST | x-user-id header | Onboarding (create/update user + generate) |
| `/api/quote/pregenerate` | POST | None (client dedup) | Trigger tomorrow's generation for user |
| `/api/quote/rate` | POST | x-user-id or cookie | Rate a quote |
| `/api/admin/login` | POST | Rate-limited (5/15min) | Admin auth → sets `admin_session` cookie |
| `/api/admin/user/[id]` | GET/PUT | admin_session cookie | User data + AI config CRUD |
| `/api/admin/user/[id]/preview-prompt` | GET | admin_session cookie | Preview generated prompt |
| `/api/cron/pregenerate` | GET | x-cron-key header | Cron: pregenerate all users |

### AI Prompt System (`src/lib/ai-service.ts`)

Exported constants (visible in admin dashboard):
- `CATEGORY_STYLE_GUIDE` — style rules per category (Achtsamkeit, Stoizismus, Wissenschaft, etc.)
- `ARCHETYPES_FOR_MODE` — archetype lists per mode (QUOTE/QUESTION/PULSE)
- `MODE_INSTRUCTIONS` — mode-specific behavior instructions
- `DEFAULT_MASTER_PROMPT` — main prompt template with `{{PLACEHOLDER}}` substitutions
- `PROMPT_VERSION` — version marker stored with generated quote metadata

Admin can override per user: `aiConfig.masterPrompt`, `temperature`, `modeWeights`, `model`, `premiumModel`, `fallbackModel`, `candidateCount`.

### History Compression (`src/lib/history-compressor.ts`)

- Scans last 100 DailyViews for a user
- Bans top 20 frequent concepts + 10 most recent concepts
- Bans all previously seen authors
- **Protected terms**: User interests are NEVER added to the ban list

### Auth

- **User sessions**: `ark_user_id` cookie (365 days, sameSite=strict), created on onboarding POST
- **Admin sessions**: `admin_session` cookie (httpOnly, secure in prod, 24h), created via `crypto.randomBytes(32)`
- **Rate limiting**: In-memory Map (IP → {count, resetAt}), max 5 attempts per 15 minutes

## Environment Variables

```
DATABASE_URL="file:./dev.db"
OPENAI_API_KEY="sk-..."
ADMIN_PASSWORD="..."           # Admin login password
CRON_API_KEY="..."             # Optional: secures /api/cron/pregenerate
```

## Key Patterns

- **Server Actions** (`src/app/actions.ts`) for server-side quote generation from client components
- **Client Components** (`"use client"`) for interactive UI (QuoteView, Onboarding, overlays)
- **JSON columns** in Prisma for flexible `preferences` and `aiConfig` — parsed with `safeJsonParse<T>()`
- **Fire-and-forget** background generation in CRON endpoint (no await, immediate response)
- **PWA** support via `src/app/manifest.ts`
- **Custom server** (`server.js`) wraps Next.js HTTP handler

## Shared Utilities (`src/lib/`)

- **`constants.ts`** — INTERESTS array, MAX_INTERESTS, AI_MODES, APP_VERSION
- **`types.ts`** — TypeScript types (User, Quote, UserPreferences, AIConfig, etc.)
- **`utils.ts`** — `safeJsonParse<T>()`, `isValidUUID()`, environment-aware `logger`
- **`prisma.ts`** — Prisma singleton instance

## Testing

No test infrastructure exists yet. No test runner configured.
Manual verification currently relies on `npm run lint`, `npx tsc --noEmit`, `DATABASE_URL=file:./ci.db npx prisma validate`, and `DATABASE_URL=file:./ci.db npm run build`.
