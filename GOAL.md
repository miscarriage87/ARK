# Goal: Make dArk a High-Variety Daily Inspiration System

## Mission

Analyze the full repository, document improvement opportunities, and design a concrete concept for turning dArk from a daily quote generator into a digital tear-off calendar that reliably delivers fresh inspiration, new perspectives, different emotional textures, and varied formats every day.

The primary product problem is user-reported repetition: daily inspirations feel too similar. The target state is not simply "better prompts", but an end-to-end variety engine with planning, generation, scoring, history awareness, model orchestration, observability, and tests.

## Original System Summary Before This Pass

dArk is a Next.js 16 App Router application using React 19, TypeScript, SQLite, Prisma, OpenAI, CSS Modules, Tailwind utilities, Framer Motion, and Lucide icons.

At audit time, the main user flow was:

1. User opens `/[username]`.
2. `QuoteView` calls `fetchDailyQuoteAction(user.id)`.
3. `src/lib/ai-service.ts:getDailyQuote(userId, forcedDate?)` checks `DailyView` for a cached user/date quote.
4. If missing, the service loads user preferences and optional `aiConfig`.
5. It randomly chooses one of three modes: `QUOTE`, `QUESTION`, or `PULSE`.
6. It randomly chooses one user interest as the category.
7. `HistoryCompressor` creates a compressed blocklist of recent authors and concepts.
8. A single master prompt is filled with mode, category, interests, history, style guide, archetypes, and mode instructions.
9. OpenAI Chat Completions returns JSON, which is parsed and stored as `Quote`.
10. `DailyView` links the user/date to the quote.
11. Client-side and cron pregeneration try to prepare tomorrow's quote.

This architecture is straightforward and functional, but its variety guarantees are currently weak because the system asks for diversity without measuring, enforcing, or storing the dimensions that make outputs feel different.

## Core Diagnosis: Why Outputs Feel Similar

1. **One dominant persona**
   The default prompt always frames the model as a "precise, modern soul coach". Even with category switches, this pushes all outputs toward the same coaching voice.

2. **Only three surface formats**
   `QUOTE`, `QUESTION`, and `PULSE` are helpful, but not enough for a daily calendar experience. Users need shifts in genre, perspective, rhetorical device, time horizon, sensory world, and practical action type.

3. **Random selection is not the same as diversity**
   Mode and category are chosen randomly. There is no deterministic plan that ensures the next 7, 14, or 30 days cover different patterns.

4. **History compression blocks too little**
   The current blocklist tracks authors and 1-3 concepts extracted from prior content. Because generated authors are often generic (`Einsicht`, `Reflexion`, `Impuls`), author blocking has little effect. Concept blocking also misses style, imagery, sentence structure, rhetorical pattern, tone, and semantic similarity.

5. **No similarity score**
   The generated content is accepted immediately if it parses as JSON. There is no lexical, semantic, stylistic, or metadata-based novelty check before storing.

6. **No candidate competition**
   The system generates one candidate. If that candidate is safe but boring or similar, it still wins. A variety-focused product should generate multiple candidates with intentionally different prompt/model lanes and pick the best.

7. **Prompt preview is stale**
   `/api/admin/user/[id]/preview-prompt` contains its own older prompt and mode instructions rather than reusing the current `DEFAULT_MASTER_PROMPT`, category style guide, archetypes, and history compressor. Admin preview can diverge from production behavior.

8. **Metadata is missing**
   The database stores `content`, `author`, `category`, `concepts`, and `sourceModel`, but not the actual diversity axes used: mode, archetype, tone, imagery, rhetorical device, prompt version, model route, novelty score, or rejection reasons.

9. **Prompt and user data are logged**
   `ai-service.ts` logs raw preferences and the final prompt. This is useful for debugging, but risky in production and noisy for user privacy.

10. **Model config is too simple**
   Per-user `aiConfig.model` exists, but the app does not yet have a model routing strategy. The code uses Chat Completions with JSON mode; official OpenAI docs recommend Structured Outputs when a schema must be matched, and current model guidance suggests choosing between frontier and smaller models based on quality, latency, and cost.

References:
- OpenAI model selection: https://developers.openai.com/api/docs/models
- OpenAI Structured Outputs: https://developers.openai.com/api/docs/guides/structured-outputs

## Product Concept: The ARK Variety Engine

The tear-off calendar should feel like a curated daily encounter, not a quote slot machine. Each day should have a planned identity.

### 1. Daily Inspiration Plan

Before generation, create an `InspirationPlan` for `userId + date` using a deterministic seed. The plan should select diversity axes such as:

- `format`: aphorism, question, micro-story, field note, paradox, small experiment, conversation prompt, art assignment, body cue, scientific wonder, contrarian lens, decision rule
- `perspective`: first-person observation, second-person challenge, third-person scene, future self, historical lens, outsider view, childlike view
- `tone`: crisp, poetic, analytical, tender, provocative, playful, quiet, absurd, precise, ceremonial
- `imageryWorld`: nature detail, city, workshop, lab, ocean, kitchen, market, body, machine, childhood, night, weather
- `rhetoricalDevice`: analogy, contrast, reversal, imperative, compressed story, sensory anchor, if-then rule, definition, contradiction
- `timeHorizon`: today, this hour, this week, ten years, childhood, end-of-life reflection
- `actionType`: observe, ask, decide, remove, repair, thank, test, move, write, speak, pause
- `difficulty`: gentle, moderate, uncomfortable

The same category can then produce very different outputs. For example, "Stoicism" could become a decision rule on Monday, a future-self question on Tuesday, a micro-story on Wednesday, and a lab-style experiment on Thursday.

### 2. Prompt Registry Instead of One Master Prompt

Replace the single master prompt with a prompt registry:

- `base/system.md`: brand voice, safety, JSON/schema contract
- `formats/*.md`: one prompt per format
- `categories/*.md`: category lenses
- `style-lanes/*.md`: tonal and rhetorical variants
- `anti-cliche.md`: evolving forbidden patterns
- `judge.md`: scoring prompt for candidate evaluation

The generator then composes a prompt from the selected plan. This avoids one dominant coaching voice and makes prompt evolution testable.

### 3. Multi-Model / Multi-Lane Generation

Use a model router rather than a single `aiConfig.model`.

Recommended OpenAI-oriented routing:

- **Default candidate generation:** `gpt-5.4-mini` for low-latency, lower-cost daily generation.
- **Premium / weekly flagship generation:** `gpt-5.5` for deeper, more surprising calendar entries.
- **Fallback generation:** `gpt-5.4-nano` for cheap retry or degraded mode.
- **Judge / metadata extraction:** `gpt-5.4-mini` or `gpt-5.4-nano` to classify tone, imagery, device, and novelty reasons.
- **Structured output:** use Structured Outputs with a JSON schema instead of plain JSON mode.

Provider-agnostic extension:

Create a `ModelProvider` interface so the app can later route to OpenAI, Anthropic, Google, Mistral, or local models without changing business logic. The first implementation can remain OpenAI-only.

### 4. Candidate Competition

Generate 3-6 candidates per day from different lanes:

1. Conservative, clear candidate.
2. Poetic/sensory candidate.
3. Contrarian or surprising candidate.
4. Practical micro-action candidate.
5. Optional premium candidate once per week.

Each candidate receives metadata:

- semantic embedding
- lexical fingerprint
- format
- tone
- imagery world
- rhetorical device
- concept list
- cliche flags
- similarity to last 7 / 30 / 100 entries
- explanation quality
- content length and readability

The app stores only the winner for the user-facing day, but optionally stores rejected candidates for diagnostics.

### 5. Novelty Scoring

Introduce a scoring function:

```text
score =
  0.30 semantic_novelty
+ 0.20 style_axis_novelty
+ 0.15 imagery_novelty
+ 0.15 format_novelty
+ 0.10 category_balance
+ 0.05 user_feedback_fit
+ 0.05 language_quality
- cliche_penalty
- repetition_penalty
```

Reject and retry when:

- semantic similarity to the last 7 entries is too high
- the same format appears too often in a rolling window
- the same imagery world repeats within 5 days
- the candidate starts with a known banned phrase
- the model returns generic coaching filler
- concepts or explanation do not match the content

### 6. Data Model Additions

Keep the existing `DailyView` uniqueness. Add richer generation metadata.

Suggested tables or fields:

- `Quote.mode`
- `Quote.format`
- `Quote.tone`
- `Quote.imageryWorld`
- `Quote.rhetoricalDevice`
- `Quote.archetype`
- `Quote.promptVersion`
- `Quote.provider`
- `Quote.sourceModel`
- `Quote.noveltyScore`
- `Quote.semanticHash`
- `Quote.lexicalFingerprint`
- `Quote.generationTrace`
- `Quote.rejectionReasons`

Potential new tables:

- `DailyPlan`: one row for `userId + date`, stores selected diversity axes.
- `GeneratedCandidate`: all generated candidates and scores.
- `PromptVersion`: registry metadata and active version tracking.
- `UserPreferenceSignal`: derived preferences from ratings and archive behavior.

### 7. Admin Dashboard Upgrade

The admin dashboard should expose the system as a creative operations console:

- last 30 days diversity heatmap by format, tone, imagery, device, category
- similarity warnings
- per-user model route
- active prompt version
- candidate scores and rejection reasons
- regenerate tomorrow with a selected plan
- preview prompt using the same production composer
- "boringness" report for recent archive

### 8. Testing and Evaluation

Add a lightweight test stack, preferably Vitest for unit tests and Playwright later for UI.

Critical tests:

- `HistoryCompressor` excludes protected interests and ranks recent/frequent concepts correctly.
- `InspirationPlan` is deterministic for `userId + date`.
- prompt composition includes all required axes and does not leak stale preview prompts.
- output schema parsing rejects malformed candidates.
- novelty scoring rejects intentionally similar content.
- `getDailyQuote` handles race conditions and orphaned quote cleanup.
- API route validation rejects unauthenticated or malformed requests.

Evaluation scripts:

- `scripts/eval-variety.ts --user <id> --days 30`
- generate a 30-day calendar in dry-run mode
- compute repetition metrics
- print category/tone/format coverage
- fail CI if similarity thresholds regress

### 9. Architecture Improvements Beyond Variety

Security:

- Make `CRON_API_KEY` required in production.
- Add authentication to `/api/quote/pregenerate`; never trust arbitrary `userId` from request body.
- Store admin sessions server-side or sign/encrypt them; the current cookie only proves that a random string exists, not that it maps to a server-side session record.
- Replace production `console.log` calls with the environment-aware logger and redact prompts/preferences.
- Validate onboarding and settings inputs with Zod, including interest allowlists.
- Validate rating score range and ensure the quote belongs to the current user before rating.

Reliability:

- Use app timezone explicitly for daily dates instead of `toISOString()` UTC date boundaries.
- Clean up orphaned `Quote` rows when race condition losers are discarded.
- Add timeouts and retry policy around model calls.
- Add a fallback cached inspirational card when OpenAI is unavailable, rather than failing the entire day.
- Make pregeneration queue-like instead of in-process fire-and-forget for production hosting.

Maintainability:

- Replace ad-hoc `JSON.parse` with `safeJsonParse` and typed schemas.
- Remove duplicated prompt logic from preview route.
- Avoid broad `any` types in UI and AI service code.
- Move OpenAI request/parse logic into a dedicated adapter.
- Replace `npm run lint` script with direct ESLint for Next 16 compatibility.
- Set `turbopack.root` or remove the parent lockfile ambiguity causing build warnings.

Documentation:

- Update README claims. It says the app ensures content "never repeating", but the current implementation does not enforce semantic uniqueness.
- Update DEV_NOTES. It mentions localStorage onboarding and `next-pwa`, which do not match the current implementation.
- Document production env requirements and cron security expectations.

## Implementation Status

Implemented in the first pass:

- `InspirationPlan` creates deterministic user/date plans with format, perspective, tone, imagery world, rhetorical device, time horizon, action type, difficulty, and generation lane.
- `getDailyQuote` now generates multiple candidates, scores them locally, and stores the highest-scoring winner.
- OpenAI output now uses Structured Outputs with a JSON schema instead of plain JSON mode.
- Quote rows now persist variety metadata: mode, format, perspective, tone, imagery world, rhetorical device, time horizon, action type, difficulty, prompt version, provider, novelty score, and generation trace.
- Admin prompt preview now reuses the production prompt composer instead of a stale duplicate prompt.
- Public quote routes now validate inputs with Zod, authenticate pregeneration against the user cookie, and validate rating ownership.
- The app now formats daily dates in the configured app timezone (`APP_TIME_ZONE`, default `Europe/Berlin`) instead of UTC-only `toISOString()` boundaries.
- Linting now uses ESLint directly for Next 16.
- Dependency audit is clean after updating Next and enforcing a safe PostCSS version.

Still open:

- Add embedding-based semantic similarity.
- Add `GeneratedCandidate` persistence for rejected candidates.
- Add automated variety evaluation scripts and tests.
- Add a full admin heatmap for 30-day repetition analysis.
- Replace admin cookie-only session proof with a server-side or signed session store.

## Verification Snapshot

Commands run on 2026-05-14:

- `npm install`: passed, generated Prisma client.
- `npm audit --audit-level=moderate`: passed, 0 vulnerabilities.
- `npm run lint`: passed.
- `npx tsc --noEmit`: passed.
- `DATABASE_URL=file:./ci.db npx prisma validate`: passed.
- `DATABASE_URL=file:./ci.db npm run build`: passed.

## Prioritized Roadmap

### Phase 1: Stabilize the Existing App

1. Done: Fix `npm run lint`.
2. Done: Resolve ESLint errors.
3. Done: Update vulnerable dependencies, especially Next.js/PostCSS.
4. Done: Stop logging raw prompts and preferences in the generation service.
5. Done: Add Zod validation to public quote routes.
6. Partial: Make cron and pregeneration auth safer in production.

### Phase 2: Build the Minimal Variety Engine

1. Done: Add `InspirationPlan`.
2. Partial: Add prompt composer; a full prompt file registry is still open.
3. Done: Store `mode`, `format`, `tone`, `imageryWorld`, `rhetoricalDevice`, `promptVersion`, and `noveltyScore`.
4. Done: Generate multiple candidates and pick the highest-scoring one.
5. Done: Add a simple lexical and metadata novelty score before adding embeddings.
6. Done: Reuse production prompt composition in admin preview.

### Phase 3: Add Semantic Novelty and Evaluation

1. Add embeddings or semantic fingerprints.
2. Add rolling similarity checks against the last 7 / 30 / 100 entries.
3. Add `scripts/eval-variety.ts`.
4. Add CI checks for deterministic planning and repetition thresholds.
5. Add admin heatmaps for repetition and format coverage.

### Phase 4: Model Routing and Creative Operations

1. Add `ModelProvider` and `ModelRouter`.
2. Route default generation to a cost-efficient model.
3. Route weekly premium entries to a frontier model.
4. Route judging and metadata extraction to a smaller model.
5. Store rejected candidates and reasons for admin inspection.
6. Let admins pin a plan or regenerate tomorrow with selected axes.

## Definition of Done

dArk can be considered meaningfully improved when:

- a 30-day generated calendar for one user has no near-duplicate content,
- no format, tone, or imagery world dominates the rolling window,
- user feedback can influence future plans without collapsing into repetition,
- admins can see why a candidate was selected or rejected,
- prompts are versioned and previewed through the same production path,
- CI catches repetition regressions before deployment,
- production logs do not expose private prompt/user preference data.

## Second Pass (2026-09-04): Feedback Loop, Clarity and Engagement Tracking

Implemented:

- Calendar leaves now carry a `headline`, a plain-language `explanation` and a concrete `microAction` for today.
  The master prompt (`ark-variety-v2`) puts "sofort verständlich" and "Wirkung" before variety rules and adds a
  weekday flavour so Mondays and Sundays read differently.
- An editorial judge (small model, Structured Outputs) scores every candidate on clarity, impact and fit and is
  blended with the local novelty score; the local scorer gained readability and impact heuristics.
- Users rate each leaf once (thumbs up/down). Ratings build a persisted taste profile (axis statistics plus an LLM
  summary with writing guidance) that biases the daily plan, the prompt and the scoring without collapsing variety.
- `DailyView` tracks `firstOpenedAt`, `revealedAt` and `openCount`, so pregenerated leaves can be distinguished from
  leaves the user actually opened and tore off. The admin view and the archive expose this.
- Admin sessions are signed (HMAC) instead of "any cookie value passes"; login and cron key comparisons are
  constant-time; `/api/quote/daily` no longer creates anonymous users.
- Vitest unit tests cover the planner, the scorer, the taste profile and the admin session tokens; CI runs
  lint, typecheck, tests, migration drift check and build. `scripts/deploy.sh` reproduces the Plesk deployment.

Still open:

- Embedding-based semantic similarity.
- `scripts/eval-variety.ts` for 30-day dry runs.
- Admin heatmaps for rolling repetition analysis.
