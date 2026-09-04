# dArk — Daily Inspiration, Personally Crafted

**dArk** (codename _Antigravity_) is a personalized daily inspiration app: a digital tear-off calendar. Each day, users receive one AI-generated leaf — an original aphorism, a reflection question or an impulse — with a headline, a plain-language explanation and one small action for today. Leaves are tailored to the user's interests, selected through a history-aware variety engine and refined by the user's own good/bad ratings.

## Features

- **One leaf per day** — quote, question or impulse, planned deterministically per user and date
- **Clear and impactful** — headline, one-sentence core thought, short explanation, concrete micro action
- **Learns from feedback** — thumbs up/down (once per leaf) builds a taste profile that steers future leaves
- **History-aware variety** — daily plans, multiple prompt lanes, novelty/readability scoring and an editorial judge model
- **Engagement tracking** — records whether a leaf was actually opened and torn off, not just generated
- **Pregeneration** — cron job and client trigger generate tomorrow's leaf overnight
- **PWA-ready** — installable on mobile devices
- **Admin dashboard** — per-user interests, taste profile, generation traces and engagement
- **Archive view** — history and favorites (every leaf rated "gut")

## Tech Stack

| Layer      | Technology                                                          |
| ---------- | ------------------------------------------------------------------- |
| Framework  | [Next.js 16](https://nextjs.org/) (App Router)                      |
| Language   | TypeScript, React 19                                                |
| Database   | SQLite + [Prisma ORM](https://www.prisma.io/) (WAL mode)            |
| AI         | [OpenAI API](https://platform.openai.com/) (GPT-5.6 routing, Structured Outputs) |
| Styling    | CSS Modules + CSS Variables                                         |
| Animations | [Framer Motion](https://www.framer.com/motion/)                     |
| Icons      | [Lucide React](https://lucide.dev/)                                 |
| Validation | [Zod](https://zod.dev/)                                             |
| Tests      | [Vitest](https://vitest.dev/)                                       |

## Getting Started

### Prerequisites

- Node.js 22+
- npm
- An [OpenAI API key](https://platform.openai.com/api-keys)

### Setup

```bash
# Clone the repository
git clone https://github.com/miscarriage87/ARK.git
cd ARK

# Install dependencies (automatically runs prisma generate)
npm install

# Configure environment
cp .env.example .env
# Edit .env with your OPENAI_API_KEY, ADMIN_PASSWORD and CRON_API_KEY

# Run database migrations
npx prisma migrate deploy

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Environment Variables

| Variable               | Required          | Description                                                        |
| ---------------------- | ----------------- | ------------------------------------------------------------------ |
| `DATABASE_URL`         | Yes               | SQLite connection (`file:./dev.db`)                                |
| `OPENAI_API_KEY`       | Yes               | OpenAI API key for content generation (offline fallback without it) |
| `ADMIN_PASSWORD`       | Yes               | Password for the admin dashboard                                   |
| `CRON_API_KEY`         | Yes in production | Secret for the pregeneration endpoint                              |
| `ADMIN_SESSION_SECRET` | No                | Separate secret for signing admin session cookies                  |
| `APP_TIME_ZONE`        | No                | Timezone for the daily boundary (default `Europe/Berlin`)          |

### Scripts

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run start        # Run production server
npm run lint         # Run ESLint
npm run typecheck    # TypeScript check
npm test             # Unit tests (Vitest)
npm run verify       # lint + typecheck + test

npm run db:generate  # Regenerate Prisma client
npm run db:migrate   # Run database migrations
npm run db:check     # Check database connectivity
npm run deploy       # Deploy main to the production host (see Deployment)

npx prisma studio    # Database GUI
```

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── admin/           # Admin auth + user management API
│   │   ├── cron/            # Background pregeneration endpoint
│   │   └── quote/           # Daily quote, rating, pregeneration
│   ├── admin/               # Admin dashboard pages
│   ├── [username]/          # User pages (quote view + archive)
│   ├── changelog/           # App changelog
│   ├── actions.ts           # Server actions (load leaf, track reveal)
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Landing page
├── components/              # React components
│   ├── ui/                  # UI primitives (intro, loading)
│   ├── QuoteView.tsx        # Main quote display
│   ├── CalendarLeaf.tsx     # Tear-off leaf with rating + share
│   ├── Onboarding.tsx       # User onboarding wizard
│   └── ...
├── lib/
│   ├── ai-service.ts        # Generation pipeline (plan → candidates → judge → store)
│   ├── inspiration-plan.ts  # Deterministic daily plan, biased by the taste profile
│   ├── novelty-scorer.ts    # Local novelty / readability / impact scoring
│   ├── taste-profile.ts     # Rating aggregation and prompt guidance (pure)
│   ├── feedback-service.ts  # Profile persistence + LLM summary
│   ├── view-tracking.ts     # Opened / revealed tracking
│   ├── admin-session.ts     # Signed admin session tokens
│   ├── history-compressor.ts# Author/concept blocklist
│   └── ...
prisma/
├── schema.prisma            # Database schema
└── migrations/              # Migration history
scripts/
├── deploy.sh                # Production deployment
├── check-db.mjs             # Connectivity check
├── seed-ai.ts               # Seed test users + history
└── backfill-date.ts         # Generate one leaf for user + date
```

## How It Works

1. User visits `/<username>` — if no leaf exists for today, one is generated.
2. The app builds a deterministic `InspirationPlan` (mode, category, format, tone, imagery, device, weekday flavour). Values the user rated well are favoured, disliked ones are pushed back without disappearing.
3. History compression scans the last 100 views to build a blocklist of used concepts; the last 30 leaves are shown to the model as "do not repeat".
4. Three prompt lanes (clarity, sensory, contrarian, practical) generate candidates with Structured Outputs.
5. Candidates get a local score (novelty, readability, impact, taste fit) and an editorial judge model scores clarity, impact and fit. The blended winner is stored with the full trace.
6. The user tears off the leaf (tracked), reads it, and rates it once. Every rating refreshes the taste profile that feeds steps 2 and 4.
7. A cron job pregenerates tomorrow's leaf for all users overnight.

## Testing

```bash
npm run verify                          # lint + typecheck + unit tests
DATABASE_URL=file:./ci.db npm run build # production build check
```

## Deployment

Production runs on a Plesk host (Node 24) behind an Apache reverse proxy. `scripts/deploy.sh [branch]` clones the branch into a new release directory on the server, backs up `.env` and the SQLite database, runs `npm ci`, `prisma migrate deploy` and `next build`, switches the `ark-current` symlink and restarts the app; a cron watchdog keeps it running and a nightly cron triggers pregeneration. Host settings are read from `.codex-deploy/deploy.env`, which is gitignored together with the SSH key. See `CLAUDE.md` for the server layout.

## License

[MIT](LICENSE)
