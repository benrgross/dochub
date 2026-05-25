# DocHub — SA Take-Home Build Plan

> Living document. Every phase, decision, and deviation gets logged here so the build is auditable and the interview walk-through has a clear paper trail.

**Project**: DocHub — pin a source-of-truth doc, propose edits via PRs (including AI-authored), review & merge.
**Stack**: Next.js 16 (App Router, Cache Components / PPR), React 19, AI SDK 6, Supabase Postgres, Vercel (Fluid Compute + AI Gateway + Edge Config + BotID).
**Budget**: 4–6 hours of build time + deploy.

---

## Customer story (the demo)

**Problem.** Cross-functional teams (PM, eng, legal, security) all edit the same long-lived docs — PRDs, runbooks, policies, security questionnaires. Notion/Google Docs have no review trail, no atomic merges, no diff-aware comments, and no first-class place for an AI to *propose* edits without clobbering the source of truth.

**Audience.** Mid-market product/eng/policy teams. The "AI proposes structured edits, humans review and merge" pattern maps directly to Vercel's "platform for agents" narrative.

**Demo flow (15–20 min):**
1. Pin a markdown doc as source of truth.
2. Click **AI Branch** → instruct Claude. Tool calls + streamed diff arrive in real time.
3. Open the resulting PR. Comment, approve, merge. Doc updates instantly via Server Action + `updateTag`; commit appears in history.
4. Architecture walk-through — map each Vercel feature to the experience.

---

## Status legend

`[ ]` pending · `[~]` in progress · `[x]` done · `[!]` blocked · `[-]` cancelled

---

## Phase 0 — Provisioning

- [x] Initial v0 scaffold imported into `claude-coworker-git/`
- [x] `supabase/migrations/0001_init.sql` written
- [x] Git repo initialized + first commit
- [ ] Supabase project provisioned, migration applied (**user-driven**)
- [ ] `vercel link` + AI Gateway enabled + `vercel env pull` (**user-driven**)

## Phase 1 — Rendering: PPR + Cache Components (prep-doc: PPR, `use cache`, RSC)

- [x] `next.config.mjs` → `next.config.ts` with `cacheComponents: true`; drop `ignoreBuildErrors`
- [x] `app/_data/documents.ts`, `app/_data/change-requests.ts`, `app/_data/commits.ts` — cached server fetchers with `cacheLife` + `cacheTag`
- [x] Split `app/page.tsx` into Server Component shell + nested tab routes (`document`, `changes`, `history`)
- [x] Suspense boundaries around dynamic content (open PR list streams, history streams)

## Phase 2 — Mutations: Server Actions (prep-doc: Server Actions, Zod)

- [x] `app/_actions/document.ts` (pin)
- [x] `app/_actions/change-requests.ts` (create, approve, merge, close)
- [x] `app/_actions/comments.ts` (add)
- [x] `app/_actions/user.ts` (cookie-backed persona)
- [x] Zod schemas + `updateTag` for same-request freshness
- [x] Delete `lib/db.ts` and `lib/supabase/client.ts`
- [x] Replace `lib/store.ts` with UI-only state via `useActionState` + `useOptimistic` (Zustand removed entirely)

## Phase 3 — Streamed AI with tools via AI Gateway (prep-doc: AI SDK, AI Gateway, tools)

- [x] Rewrite `app/api/ai-edit/route.ts` → `streamText` with tools, `model: 'anthropic/claude-sonnet-4.6'` routed through AI Gateway automatically
- [x] `runtime = 'nodejs'`, `maxDuration = 60` (Fluid Compute talking point)
- [x] Tools: `proposeReplacement`, `proposeInsertion` (Zod `inputSchema`)
- [x] Rewire `components/ai-branch-modal.tsx` to `@ai-sdk/react` `useChat` with streamed tool-call cards
- [x] Drop the auto-merge checkbox (anti-pattern for the agent narrative)

## Phase 4 — Source-doc upload + Edge Config flags (prep-doc: Edge Config)

- [x] `app/(app)/upload/page.tsx` + drag-drop markdown upload + `pinDocument` Server Action
- [x] First-time visit funnels to `/upload` when no pinned doc exists (root redirect)
- [x] Edge Config store: `aiBranchEnabled: boolean`, `aiModel` string override
- [x] AI route reads Edge Config via `lib/flags.ts`; falls back to env in local dev

## Phase 5 — Routing Middleware + observability (prep-doc: Routing Middleware, security)

- [x] `middleware.ts` security headers (CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy, X-Content-Type-Options) on every HTML response
- [x] Sliding-window rate limit per IP (10/min) on `POST /api/ai-edit` via Vercel Runtime Cache API; fails open on cache errors
- [x] `vercel.ts` (replaces `vercel.json`) with cache-control headers on static icons
- [-] `@vercel/botid` (dropped per Track-A re-scope; keep simple rate limit instead)

## Phase 6 — Deploy + README + Vercel Agent (prep-doc: Speed Insights, Web Analytics, Vercel Agent)

- [x] `@vercel/speed-insights` + `@vercel/analytics` wired in `app/layout.tsx`
- [x] README walk-through of every architectural decision
- [ ] **External**: push to GitHub, import into Vercel project, set env vars, deploy
- [ ] **External**: enable Vercel Agent code review on the GitHub repo
- [ ] **External**: verify Speed Insights + Web Analytics show data after the demo session

## Track A polish (added 2026-05-25 after re-scope discussion)

- [x] Filter + search on the CR list — URL-driven (`?filter=…&q=…`), only the Suspense boundary re-streams
- [x] Parallel routes — `@list` sidebar stays mounted across PR navigation (no remount, no scroll loss)
- [x] `generateMetadata` on `/changes/[crId]` reuses cached `getChangeRequest` for SEO/OG cards
- [-] BotID (de-scoped — felt too Track-B-heavy)
- [-] `aiModel` Edge Config override (kept code path, removed demo emphasis — kill switch only in the live walkthrough)

## Stretch goals

- [ ] Supabase Realtime for live PR comments (Track A "real-time elements")
- [ ] Workflow SDK for scheduled "doc audit" cron (durable agent)
- [ ] Clerk auth via Marketplace (drops the user-picker stub)

---

## Decision log

> Append-only. Newest at top.

### 2026-05-25 · Initial scope locked
- **Architecture**: Targeted refactor — keep v0 UI components, move data fetching to Server Components, mutations to Server Actions, AI to streamed Vercel Function with tools, add PPR + `use cache` + `cacheTag`. (Selected over hybrid/minimal to maximize the "modern Next.js mastery" story.)
- **AI model**: Anthropic `claude-sonnet-4.6` primary via AI Gateway, with `openai/gpt-5.4` and Bedrock Claude as fallback. Matches "Claude coworker" branding.
- **Auth**: Defer real auth; user picker (PM / Engineer / Legal personas) for v1. Talking point: Clerk via Marketplace as v2.
- **RLS**: Off in v1 demo. Talking point: enable per-team RLS with Clerk JWTs in v2.
- **Realtime**: Stretch goal; only add if comfortably ahead of schedule.
- **Auto-merge**: Removed from AI Branch flow. The agent-platform narrative is human-in-the-loop; auto-merge undermines the story.

---

## External setup checklist (user-driven)

What's left to flip the deployed app from "code complete" to "live demo URL." None of these are code changes — they're dashboard / CLI operations.

### 1. Supabase

- [ ] Create a project (supabase.com or via Vercel Marketplace).
- [ ] Open the SQL editor, paste & run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
- [ ] Grab the project URL + anon key from `Project → Settings → API`.
- [ ] (Optional) Verify with: `select * from documents;` → should return 0 rows.

### 2. Vercel link + env

```bash
cd claude-coworker-git
pnpm dlx vercel link            # connect this folder to a Vercel project
pnpm dlx vercel env add NEXT_PUBLIC_SUPABASE_URL
pnpm dlx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
pnpm dlx vercel env pull .env.local
```

If you provisioned Supabase via the Marketplace, the env vars are auto-set and `vercel env pull` is all you need.

### 3. AI Gateway

- [ ] In the Vercel dashboard: `Project → Settings → AI Gateway → Enable`.
- [ ] The OIDC token now flows in via `vercel env pull` automatically — no `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` needed.

### 4. Edge Config (optional but the kill-switch story is great)

- [ ] `Project → Storage → Create → Edge Config`, link to the project.
- [ ] Add keys:
  ```json
  { "aiBranchEnabled": true, "aiModel": "auto" }
  ```
- [ ] `vercel env pull .env.local` again to pick up `EDGE_CONFIG`.
- [ ] Flip `aiBranchEnabled: false` mid-demo to show the kill switch.

### 5. GitHub + deploy

- [ ] `gh repo create dochub --public --source=. --push` (or push to your existing GitHub).
- [ ] In Vercel: `Add New → Project → Import GitHub repo`. Set production branch = `main`.
- [ ] Verify the deployed URL works end-to-end (upload → AI branch → merge).
- [ ] In `Settings → Vercel Agent → Code Review`: enable on the repo.

### 6. Day-of demo

- [ ] Open the deployed URL beforehand to warm the function (first invocation has cold-start latency that distracts from the demo).
- [ ] Have DevTools open on the Performance + Network tabs — the streaming + Suspense story plays best visually.
- [ ] Pull up the Speed Insights dashboard in another tab.
- [ ] Have an interesting source doc pre-pinned (e.g. an actual PRD or a runbook).

---

## Trade-offs to volunteer in the interview

- **Why not Edge runtime for the AI route?** PPR + `use cache` need Node; Fluid Compute already beats Edge for long-tail I/O like LLM streaming. Active CPU pricing wins on AI workloads.
- **Why keep Zustand at all?** Optimistic UX on PR comments is materially better than round-tripping every keystroke. Server Actions are source of truth; the store is a UI cache.
- **Why not Workflow SDK here?** AI Branch is single-step (request → tool calls → response). I'd reach for Workflow on multi-step durable flows (scheduled compliance audits, cross-doc refactors). Showing I know when *not* to use a feature.
- **Why Supabase, not Neon?** Either works via Marketplace. Picked Supabase because Realtime gives a free "live PR comments" demo and Auth is a one-step v2 upgrade.
- **Where this breaks at scale?** PR table grows fastest; partition by `document_id` past ~1M rows. AI costs scale with usage — that's exactly what AI Gateway tags + budgets exist for.

---

## File map (created or substantially rewritten)

- `next.config.ts` (replaces `next.config.mjs`)
- `vercel.ts` (new — typed project config)
- `middleware.ts` (new)
- `supabase/migrations/0001_init.sql` (new)
- `app/page.tsx` (rewritten — Server Component shell)
- `app/(tabs)/document/page.tsx`, `app/(tabs)/changes/page.tsx`, `app/(tabs)/history/page.tsx` (new)
- `app/(tabs)/document/upload/page.tsx` (new)
- `app/_data/*.ts` (new — cached server fetchers)
- `app/_actions/*.ts` (new — Server Actions)
- `app/api/ai-edit/route.ts` (rewritten — streamed + tools + Gateway)
- `lib/edge-config.ts`, `lib/runtime-cache.ts` (new)
- `lib/store.ts` (rewritten — UI-only state)
- `components/ai-branch-modal.tsx` (rewritten — `useChat` + tool-call cards)
- **Deleted**: `lib/db.ts`, `lib/supabase/client.ts`

---

## Build log

> Phase completions, blockers, deviations. Newest at top.

### 2026-05-25 · Phase 5 + 6 (code) complete (commit `acfb978`)
- `middleware.ts`: CSP + X-Frame-Options + Referrer-Policy + Permissions-Policy + X-Content-Type-Options on every HTML response. POST `/api/ai-edit` runs through a 10-req/min/IP rate limiter backed by `@vercel/functions` `getCache()` — no external Redis. Fails open if the cache layer errors so legitimate traffic never gets blocked.
- `vercel.ts` typed config — long-immutable cache-control on static icons. Replaces `vercel.json`.
- `README.md` walks through the full architecture, file-by-file, with trade-offs and a demo flow.
- **Remaining external steps**: push to GitHub, link Vercel project, `vercel env pull`, enable AI Gateway, optionally enable Edge Config, deploy. See "External setup checklist" below.

### 2026-05-25 · Track A polish + parallel routes (commit `4fe9cf8`)
- Re-scoped per discussion: trimmed Track-B-flavored items (BotID, deep AI Gateway routing) and added Track-A flourishes.
- URL-driven filter + search on the CR list (`?filter=open|closed|ai&q=…`). Filter changes re-stream only the `@list` Suspense boundary.
- Restructured `/changes` into parallel routes: `@list` slot stays mounted across PR navigation (no remount, no scroll loss). Demo moment: open DevTools React profiler, click around — the sidebar tree is stable.
- `generateMetadata` on `/changes/[crId]` — reuses the cached `getChangeRequest` so OG previews don't add a DB hit.

### 2026-05-25 · Phase 3 complete (commit `17cb01d`)
- `/api/ai-edit` now uses `streamText` with two tools (`proposeReplacement`, `proposeInsertion`). Each tool's `execute` validates that the target text actually exists in the doc and tells the model to retry if not — that's the "self-correcting" agent loop.
- Plain `'anthropic/claude-sonnet-4.6'` model string — AI Gateway is the default routing layer; no `gateway()` wrapper needed.
- Edge Config kill switch (`aiBranchEnabled`) read at the top of the route. Local-dev fallback via env var so the dev loop has no friction.
- Modal rewritten with `@ai-sdk/react` `useChat` + `DefaultChatTransport`. Doc + instructions ride along on every send via the transport's dynamic `body`. Tool calls render as cards live as they stream. Proposals get applied to a virtual buffer client-side; the existing `DiffViewer` shows the unified diff. "Create branch" calls the `createChangeRequest` Server Action with the full `aiMetadata` audit trail.
- `convertToModelMessages` is async in v6 — had to `await` it.

### 2026-05-25 · Phase 1 + 2 complete (commit `0651c78`)
- Migrated to `next.config.ts` with `cacheComponents: true`; dropped `ignoreBuildErrors`.
- Routes split into `(app)` route group with a shared chrome layout; redirect from `/` to `/document` or `/upload`.
- Cached server fetchers in `app/_data/` for the document, individual CRs, and commits — open-CR list intentionally NOT cached (real-time PR status).
- **Hit a Cache Components constraint**: the Supabase server client uses `cookies()`, which is forbidden inside `use cache`. Introduced `lib/supabase/service.ts` (no cookie binding) for cached reads. Mutations still use the cookie-bound `createServerClient` so RLS-backed auth lands cleanly in v2.
- Server Actions for every mutation, all Zod-validated, all call `updateTag` for same-request freshness + `revalidatePath` for sidebar refresh.
- Components refactored to receive data via props; the v0 Zustand store is gone — `useActionState` + `useOptimistic` cover the optimistic UX (comments, merge/approve buttons via `useTransition`).
- Persona picker (header dropdown) stub for Clerk auth in v2.
- Drag-and-drop `.md` / `.txt` upload form that pins via the `pinDocument` Server Action.
- pnpm 10.15 installed (Node 20 compat); deps swapped: removed `zustand`, added `@vercel/speed-insights`, `@vercel/edge-config`, `botid`, `@vercel/config`.

### 2026-05-25 · Phase 0 (code-side complete)
- Wrote `supabase/migrations/0001_init.sql` — tables: `documents` (with `pinned` boolean + partial unique index for "one pinned doc"), `change_requests` (with `ai_metadata jsonb` for tool-call audit trail), `comments`, `commits` (with `content_snapshot` for true append-only history).
- Initialized git repo on `main`, first commit `f31a363`.
- **Blocker**: external Supabase + Vercel setup is user-driven; build/dev requires real env vars.
