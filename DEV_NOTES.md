# DEV NOTES - dArk (Antigravity)

## Tech Stack
- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Database**: SQLite with Prisma (WAL mode)
- **AI**: OpenAI Chat Completions with Structured Outputs (candidate generation, editorial judge, taste summary)
- **Styling**: CSS Modules + global CSS variables; Tailwind utilities are available for admin/marketing pages
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Tests**: Vitest (`npm test`)

## Data Model
- **User**: minimal profile, JSON `preferences` (interests), optional admin `aiConfig`, learned `tasteProfile` (JSON).
- **Quote**: generated leaf with `headline`, `content`, `explanation`, `microAction`, concepts and variety metadata.
- **DailyView**: one row per user and day (unique). `firstOpenedAt`, `revealedAt` and `openCount` record real engagement;
  `viewedAt` is only the row creation time (often a pregeneration).
- **Rating**: one verdict per user and quote, `score` 5 = "gut", 1 = "schlecht".

## Key Decisions
- **Onboarding**: the wizard posts name + interests to `/api/quote/daily`, which sets the `ark_user_id` cookie.
  The server action that loads today's leaf also (re)sets that cookie so new devices can rate and pregenerate.
- **Quote generation**: plan (deterministic per user/date, biased by the taste profile) -> 3 prompt lanes in parallel
  -> local novelty/readability/impact scoring -> LLM judge -> winner stored with a full trace.
- **Feedback loop**: every rating refreshes the taste profile in the background; the generator refreshes lazily when
  ratings are newer than the profile.
- **Timezone**: all day boundaries use `formatAppDate()` (`APP_TIME_ZONE`, default `Europe/Berlin`).
- **PWA**: manual Next.js manifest (`src/app/manifest.ts`).

## Environment Variables
See `.env.example`. `CRON_API_KEY` is mandatory in production; `ADMIN_SESSION_SECRET` is optional.
