# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**dArk** (internal name: "Antigravity") is a personalized daily inspiration app: a digital tear-off calendar. Users receive one AI-generated leaf per day (aphorism, reflection question or impulse) with a headline, explanation and a concrete micro action, based on their interests and their own good/bad ratings. One leaf per user and day, cached.

## Commands

```bash
npm run dev          # Start dev server (Next.js)
npm run build        # Production build
npm run start        # Run production server
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm test             # Vitest unit tests (src/lib/__tests__)
npm run verify       # lint + typecheck + test
npm run db:check     # Check database connectivity
npm run db:generate  # Regenerate Prisma client
npm run db:migrate   # Run prisma migrate deploy (production migrations)
npm run deploy       # scripts/deploy.sh main (see Deployment)
```

### Database
```bash
npx prisma studio                        # Database GUI
npx prisma generate                      # Regenerate client (after schema.prisma changes)
npx prisma migrate deploy                # Apply migrations
```

Migrations are hand-written SQL in `prisma/migrations/<timestamp>_<name>/migration.sql`. CI checks that they match `schema.prisma` via `prisma migrate diff`.

### Utility Scripts
```bash
npx tsx scripts/seed-ai.ts                          # Seed DB with test users + 5-day history
npx tsx scripts/backfill-date.ts <userId> [date]    # Generate a single leaf for user + date
```

## Architecture

### Tech Stack
- **Next.js 16** (App Router) with TypeScript + React 19
- **SQLite** + Prisma ORM (WAL mode)
- **OpenAI API** via Chat Completions + Structured Outputs (`src/lib/openai-client.ts`)
- **CSS Modules** + global CSS variables for component styling; Tailwind utilities for admin/marketing pages
- **Framer Motion** for animations, **Lucide React** for icons
- **Zod** for input validation and output schemas
- **Vitest** for unit tests

### Core Flow: Daily Leaf per User

Entry point: `src/lib/ai-service.ts:getDailyQuote(userId, forcedDate?)`

1. Check `DailyView` for user+date → return cached quote (with the user's verdict) if it exists
2. Build the generation context: preferences, admin `aiConfig`, taste profile (`ensureFreshTasteProfile` rebuilds it lazily when ratings are newer), last 30 leaves, history blocklist
3. Build a deterministic `InspirationPlan` (`src/lib/inspiration-plan.ts`): mode, category, format, perspective, tone, imagery world, rhetorical device, time horizon, action type, difficulty, lane, weekday flavour. Liked axis values are favoured, disliked ones pushed back (variety still wins eventually)
4. Generate `candidateCount` candidates in parallel across lanes (clarity / sensory / contrarian / practical) with Structured Outputs; fallback model on failure; offline fallback without API key
5. Score locally (`src/lib/novelty-scorer.ts`): lexical novelty vs. history, readability, impact, taste fit, cliché and axis-repeat penalties
6. Editorial judge (`judgeModel`) rates clarity / impact / fit per candidate; final = 0.55 local + 0.45 judge (judge failures degrade to local score)
7. Save the winner (`headline`, `content`, `explanation`, `microAction`, variety metadata, `generationTrace`) and create the `DailyView`

**Race condition handling**: concurrent generation for the same user+date is resolved via the `(userId, date)` unique constraint (P2002): the loser deletes its quote and returns the winner's.

### Feedback Loop (Taste Profile)

- `POST /api/quote/rate` stores one verdict per user and quote (`Rating.score` 5 = up, 1 = down) and schedules a background profile refresh
- `src/lib/taste-profile.ts` (pure): axis statistics with smoothing, `feedbackFit`, planner preferences, German prompt block
- `src/lib/feedback-service.ts`: loads ratings, asks `profileModel` for a short summary + writing guidance (≥ 3 ratings), persists `User.tasteProfile` JSON
- The profile enters the master prompt (`{{TASTE_PROFILE}}`), the judge prompt, the planner bias and the local score. It is a compass, not a template: variety rules stay on top

### Engagement Tracking

- `DailyView.viewedAt` is only the row creation time (often a pregeneration)
- `fetchDailyQuoteAction` (used by `QuoteView`) calls `markDailyViewOpened` → `firstOpenedAt`, `openCount`
- Tearing off the leaf calls `revealDailyQuoteAction` → `revealedAt`
- The archive marks leaves since `VIEW_TRACKING_SINCE` that were never opened; the admin user page shows opened / read / rating per day

### CRON / Background Pregeneration

1. **Server-side CRON** (`/api/cron/pregenerate`): external scheduler (e.g. daily 03:00), secured via `CRON_API_KEY` (header `x-cron-key` or `?key=`, required in production), responds immediately and generates in the background for all onboarded users missing tomorrow's leaf
2. **Client-side trigger** (`/api/quote/pregenerate`): `QuoteView` triggers it after showing today's leaf (sessionStorage dedup); requires the `ark_user_id` cookie to match the body's `userId`

### Data Model (prisma/schema.prisma)

- **User**: name (URL identifier), JSON `preferences` (interests), optional `aiConfig` (admin override: temperature, prompt, models, modeWeights, candidateCount), `tasteProfile` JSON + `tasteProfileUpdatedAt`
- **Quote**: `headline`, `content`, `author` (mode label: Einsicht / Reflexion / Impuls), `explanation`, `microAction`, `concepts` JSON, variety metadata (mode, format, perspective, tone, imageryWorld, rhetoricalDevice, timeHorizon, actionType, difficulty), `promptVersion`, `provider`, `sourceModel`, `noveltyScore` (final blended score), `generationTrace` JSON
- **DailyView**: User+Quote+Date, unique `(userId, date)`, plus `firstOpenedAt`, `revealedAt`, `openCount`
- **Rating**: unique per user+quote, `score` 5 (gut) / 1 (schlecht)
- **Share**: share tracking (unused by the current UI)

### Routing Structure

| Route | Purpose |
|-------|---------|
| `/` | Animated landing/intro page |
| `/[username]` | Main user page (SSR) — shows Onboarding or QuoteView |
| `/[username]/archive` | Archive of past leaves (`?filter=favorites` = rated "gut") |
| `/admin` | Admin login page |
| `/admin/dashboard` | User list + system context |
| `/admin/user/[id]` | Per-user interests, taste profile, history with traces and engagement |
| `/changelog` | Release notes |

### API Routes

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/quote/daily` | GET | x-user-id header | Fetch today's leaf (no view tracking) |
| `/api/quote/daily` | POST | — | Onboarding / settings (create or update user, sets cookie) |
| `/api/quote/pregenerate` | POST | cookie must match userId | Generate tomorrow's leaf for the user |
| `/api/quote/rate` | POST | x-user-id or cookie | One-time verdict `{ quoteId, verdict: "up" \| "down" }` |
| `/api/admin/login` | POST | rate-limited (5/15min) | Admin auth → signed `admin_session` cookie |
| `/api/admin/user/[id]` | GET/PUT | admin session | User data, ratings, AI config / preferences CRUD |
| `/api/admin/user/[id]/preview-prompt` | GET | admin session | Preview the production prompt + plan + profile |
| `/api/cron/pregenerate` | GET | x-cron-key | Cron: pregenerate all users |

Server actions (`src/app/actions.ts`): `fetchDailyQuoteAction(userId)` (loads today's leaf, tracks the open, sets the cookie) and `revealDailyQuoteAction(userId, quoteId)`.

### AI Prompt System (`src/lib/ai-service.ts`)

Exported constants (visible in the admin dashboard):
- `CATEGORY_STYLE_GUIDE` — style rules per category
- `ARCHETYPES_FOR_MODE`, `MODE_INSTRUCTIONS` — per mode (QUOTE / QUESTION / PULSE)
- `LANE_GUIDE` — what each candidate lane optimises for
- `DEFAULT_MASTER_PROMPT` — template with `{{MODE}}`, `{{CATEGORY}}`, `{{INTERESTS}}`, `{{DAY_FLAVOR}}`, `{{CATEGORY_STYLE_GUIDE}}`, `{{MODE_INSTRUCTIONS}}`, `{{TASTE_PROFILE}}`, `{{BANNED_AUTHORS}}`, `{{BANNED_CONCEPTS}}`, `{{RECENT_CONTENT}}`; a custom admin prompt without `{{TASTE_PROFILE}}` gets the block appended
- `PROMPT_VERSION` — stored with each quote (`ark-variety-v2`)

Model routing defaults (`src/lib/ai-config.ts`): `model` gpt-5.6-terra, `premiumModel` gpt-5.6-sol (every ~7th day on the third lane), `fallbackModel` gpt-5.4-mini, `judgeModel` / `profileModel` gpt-5.6-luna. Reasoning models get `reasoning_effort: "low"` instead of `temperature`. Admin can override all of them per user via `aiConfig`.

Output contracts live in `src/lib/quote-output.ts` (candidate, judge verdict, taste summary). Keep the Zod schema and the JSON schema in sync.

### History Compression (`src/lib/history-compressor.ts`)

- Scans last 100 DailyViews; bans top 20 frequent + 10 most recent concepts and previously used non-generic authors
- **Protected terms**: user interests are never banned

### Auth

- **User sessions**: `ark_user_id` cookie (365 days, sameSite=strict), set on onboarding POST and by `fetchDailyQuoteAction`. Knowing the username is the access model
- **Admin sessions**: HMAC-signed token (`src/lib/admin-session.ts`, secret from `ADMIN_SESSION_SECRET` or `ADMIN_PASSWORD`), httpOnly cookie, 24h. Verify with `isAdminAuthenticated()` from `src/lib/admin-auth.ts`
- **Rate limiting**: in-memory Map (IP → count) for admin login, 5 attempts / 15 minutes
- Password and cron key comparisons are constant-time

## Environment Variables

```
DATABASE_URL="file:./dev.db"
OPENAI_API_KEY="sk-..."        # Without it the app generates offline fallback leaves
ADMIN_PASSWORD="..."           # Admin login password
CRON_API_KEY="..."             # Required in production for /api/cron/pregenerate
ADMIN_SESSION_SECRET="..."     # Optional, separate cookie-signing secret
APP_TIME_ZONE="Europe/Berlin"  # Optional
```

## Key Patterns

- **Server Actions** (`src/app/actions.ts`) for loading and tracking from client components
- **Client Components** (`"use client"`) for interactive UI (QuoteView, CalendarLeaf, Onboarding, overlays)
- **JSON columns** in Prisma for `preferences`, `aiConfig`, `tasteProfile`, `generationTrace` — parsed with `safeJsonParse<T>()` / `parseTasteProfile()`
- **Fire-and-forget** background work (cron generation, profile refresh) is logged, never awaited by the response
- **Timezone**: always use `formatAppDate()` for day keys on the server and `formatLocalDate()` on the client; never `toISOString().split("T")[0]`
- **Logging**: use `logger` from `src/lib/utils.ts`; never log prompts, preferences or secrets
- **PWA** support via `src/app/manifest.ts`; **custom server** (`server.js`) is the Passenger startup file

## Shared Utilities (`src/lib/`)

- `constants.ts` — INTERESTS, MAX_INTERESTS, AI_MODES, APP_VERSION (from package.json), VIEW_TRACKING_SINCE
- `types.ts` — TypeScript types (User, Quote, QuoteWithMeta, AIConfig, …)
- `utils.ts` — `safeJsonParse<T>()`, `isValidUUID()`, `formatAppDate()`, `formatLocalDate()`, `addDays()`, `logger`
- `text-metrics.ts` — Jaccard similarity and simple text counters
- `prisma.ts` — Prisma singleton instance

## Testing

- Unit tests: `npm test` (Vitest, `src/lib/__tests__/*.test.ts`) for planner determinism and bias, scoring heuristics, taste profile maths, admin session tokens
- Inner loop: `npm run verify`; before a release: `DATABASE_URL=file:./ci.db npm run build`
- CI (`.github/workflows/ci.yml`): prisma validate + migration drift check, lint, typecheck, tests, build

## Deployment (Plesk / Strato)

The production host was rebuilt on 2026-09-01. The app now lives in the subscription home (`DEPLOY_BASE`, currently `/var/www/vhosts/dealradar.2pohl.de`, domain `dark.2pohl.de`) with a releases/shared layout; Apache proxies the domain to `127.0.0.1:$PORT` and there is no Passenger involved:

```
ark-shared/.env            secrets, PORT=3001, HOSTNAME=127.0.0.1, absolute DATABASE_URL (chmod 600, never in git)
ark-shared/prod.db         SQLite database (restored from the 2026-05-16 backup, then migrated)
ark-shared/backups/        .env + DB snapshots taken by every deploy
ark-shared/logs/           app.log, watchdog.log, cron.log
ark-shared/start.sh        runs `node server.js` for ark-current with the shared .env (Node 24)
ark-shared/watchdog.sh     cron (* * * * *): starts the app when nothing listens on PORT
ark-shared/restart.sh      kills the running app and calls watchdog.sh (used by deploys)
ark-shared/pregenerate.sh  cron (5 3 * * *): calls /api/cron/pregenerate on 127.0.0.1 with CRON_API_KEY
ark-releases/ark-<ts>/     git clone + node_modules + .next per release (last 3 kept)
ark-current -> ark-releases/ark-<ts>
```

- `scripts/deploy.sh [branch]` (default `main`): backs up `.env` + DB, clones the branch into a new release, symlinks the shared `.env`, runs `npm ci`, `prisma migrate deploy`, `next build`, switches `ark-current`, restarts via `restart.sh`, waits for the port, prunes old releases and health-checks the public URL
- Host settings are read from `.codex-deploy/deploy.env`; the SSH key lives in `.codex-deploy/` as well. Both are gitignored and must never be committed
- Legacy directories `ark-app` (v1.2 source) and `ark-runtime` (standalone build, empty DB) from the 2026-09-04 manual restore are still present but unused
