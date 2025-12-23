# DEV NOTES - Antigravity Tool

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: SQLite with Prisma
- **AI**: OpenAI API
- **Styling**: CSS Modules + Global CSS Variables (No Tailwind)
- **Icons**: Lucide React
- **Animations**: Framer Motion

## Data Model
- **User**: Stores minimal profile and JSON preferences.
- **Quote**: Stores generated quotes. Quotes are generated on demand or pre-fetched.
- **DailyView**: Tracks what a user saw on a specific day to ensure history references work.

## Key Decisions
- **Onboarding**: A multi-step wizard stores preferences in `localStorage` until completion, then syncs to DB.
- **Quote Generation**: 
    - Daily trigger or User request?
    - **Decision**: On visit. If no quote exists for User+Date in `DailyView`, generate one or fetch a relevant pre-generated one.
- **PWA**: Using `next-pwa` (or manual manifest configuration) for installability.

## Environment Variables
- `DATABASE_URL="file:./dev.db"`
- `OPENAI_API_KEY="..."`
