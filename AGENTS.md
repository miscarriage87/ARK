# AGENTS.md

Guidance for Codex and other coding agents working in this repository.

**Read `CLAUDE.md` first.** It is the single source of truth for architecture, commands,
data model, API routes, prompt system and deployment. This file only adds agent-specific notes
so the two documents cannot drift apart.

## Working agreements

- Code, comments, commits, tests and docs are written in English; product copy shown to users is German.
- Run the inner loop before handing work back: `npm run lint && npm run typecheck && npm test`.
- Run `DATABASE_URL=file:./ci.db npm run build` before a release commit.
- Schema changes need a hand-written SQL migration in `prisma/migrations/` plus `npx prisma generate`.
  CI verifies that migrations and `schema.prisma` match (`prisma migrate diff`).
- Never commit `.env`, `.codex-deploy/` (SSH deploy key, deploy config) or `DB-BACKUPS/`.
- Production deploys go through `scripts/deploy.sh <branch>`; the host configuration lives in
  `.codex-deploy/deploy.env` (gitignored).
