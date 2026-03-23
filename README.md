# dArk — Daily Inspiration, Personally Crafted

**dArk** (codename _Antigravity_) is a personalized daily inspiration app. Each day, users receive an AI-generated quote, reflection question, or creative impulse — tailored to their interests and never repeating.

## Features

- **One inspiration per day** — quote, question, or impulse, selected by weighted random mode
- **Personalized content** — AI generates based on user interests and categories
- **History-aware** — a compression algorithm ensures no repeated authors or concepts
- **Pregeneration** — CRON job generates tomorrow's content overnight
- **PWA-ready** — installable on mobile devices
- **Admin dashboard** — per-user AI config (temperature, prompt, model, mode weights)
- **Archive view** — browse past inspirations with calendar navigation

## Tech Stack

| Layer      | Technology                                                  |
| ---------- | ----------------------------------------------------------- |
| Framework  | [Next.js 16](https://nextjs.org/) (App Router)              |
| Language   | TypeScript, React 19                                        |
| Database   | SQLite + [Prisma ORM](https://www.prisma.io/) (WAL mode)    |
| AI         | [OpenAI API](https://platform.openai.com/) (GPT-5 / GPT-4o) |
| Styling    | CSS Modules + CSS Variables                                 |
| Animations | [Framer Motion](https://www.framer.com/motion/)             |
| Icons      | [Lucide React](https://lucide.dev/)                         |
| Validation | [Zod](https://zod.dev/)                                     |

## Getting Started

### Prerequisites

- Node.js 20+
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
# Edit .env with your OPENAI_API_KEY and ADMIN_PASSWORD

# Run database migrations
npx prisma migrate deploy

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Environment Variables

| Variable         | Required | Description                                     |
| ---------------- | -------- | ----------------------------------------------- |
| `DATABASE_URL`   | Yes      | SQLite connection (`file:./dev.db`)             |
| `OPENAI_API_KEY` | Yes      | OpenAI API key for content generation           |
| `ADMIN_PASSWORD` | Yes      | Password for the admin dashboard                |
| `CRON_API_KEY`   | No       | Secret key to secure the pregeneration endpoint |

### Scripts

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run start        # Run production server
npm run lint         # Run ESLint

npm run db:generate  # Regenerate Prisma client
npm run db:migrate   # Run database migrations
npm run db:check     # Check database connectivity

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
│   ├── actions.ts           # Server actions
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Landing page
├── components/              # React components
│   ├── ui/                  # UI primitives (intro, loading)
│   ├── QuoteView.tsx        # Main quote display
│   ├── Onboarding.tsx       # User onboarding wizard
│   ├── CalendarLeaf.tsx     # Calendar navigation
│   └── ...
├── lib/
│   ├── ai-service.ts        # Core AI generation logic
│   ├── history-compressor.ts # Quote deduplication
│   ├── prisma.ts            # Prisma singleton
│   ├── constants.ts         # App constants
│   ├── types.ts             # TypeScript types
│   └── utils.ts             # Shared utilities
prisma/
├── schema.prisma            # Database schema
└── migrations/              # Migration history
```

## How It Works

1. User visits `/<username>` — if no quote exists for today, one is generated
2. The AI selects a mode (Quote 50% / Question 30% / Impulse 20%) and a random category from user interests
3. History compression scans the last 100 views to build a blocklist of used authors and concepts
4. The prompt is assembled with category-specific style guides and mode instructions
5. OpenAI generates structured JSON — the response is saved and displayed
6. A background job pregenerates tomorrow's content for all users overnight

## License

[MIT](LICENSE)
