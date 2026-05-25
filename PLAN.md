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
- [ ] `supabase/migrations/0001_init.sql` written
- [ ] Git repo initialized + first commit
- [ ] Supabase project provisioned, migration applied (**user-driven**)
- [ ] `vercel link` + AI Gateway enabled + `vercel env pull` (**user-driven**)

## Phase 1 — Rendering: PPR + Cache Components (prep-doc: PPR, `use cache`, RSC)

- [ ] `next.config.mjs` → `next.config.ts` with `cacheComponents: true`; drop `ignoreBuildErrors`
- [ ] `app/_data/documents.ts`, `app/_data/change-requests.ts`, `app/_data/commits.ts` — cached server fetchers with `cacheLife` + `cacheTag`
- [ ] Split `app/page.tsx` into Server Component shell + nested tab routes (`document`, `changes`, `history`)
- [ ] Suspense boundaries around dynamic content (open PR list streams)

## Phase 2 — Mutations: Server Actions (prep-doc: Server Actions, Zod)

- [ ] `app/_actions/document.ts` (pin, upload)
- [ ] `app/_actions/change-requests.ts` (create, approve, merge, close)
- [ ] `app/_actions/comments.ts` (add)
- [ ] Zod schemas + `updateTag` for same-request freshness
- [ ] Delete `lib/db.ts` and `lib/supabase/client.ts`
- [ ] Strip `lib/store.ts` to UI-only state; wire `useActionState` + `useOptimistic`

## Phase 3 — Streamed AI with tools via AI Gateway (prep-doc: AI SDK, AI Gateway, tools)

- [ ] Rewrite `app/api/ai-edit/route.ts` → `streamText` with tools, `model: 'anthropic/claude-sonnet-4.6'`, fallback to `openai/gpt-5.4` via `providerOptions.gateway`
- [ ] Force `runtime = 'nodejs'`, `maxDuration = 60` (Fluid Compute talking point)
- [ ] Tools: `proposeReplacement`, `proposeInsertion` (Zod input schemas)
- [ ] Rewire `components/ai-branch-modal.tsx` to `useChat` with streamed tool-call cards
- [ ] Drop the auto-merge checkbox (anti-pattern for the agent narrative)

## Phase 4 — Source-doc upload + Edge Config flags (prep-doc: Edge Config)

- [ ] `app/(tabs)/document/upload/page.tsx` + drag-drop markdown upload + `pinDocument` Server Action
- [ ] First-time visit funnels to upload when no pinned doc exists
- [ ] Edge Config store: `aiBranchEnabled: boolean`, `aiModel: 'auto' | 'anthropic/claude-sonnet-4.6' | 'openai/gpt-5.4'`
- [ ] AI route reads Edge Config; flips without redeploy

## Phase 5 — Routing Middleware + BotID + observability (prep-doc: Firewall, BotID, security)

- [ ] `middleware.ts` with `@vercel/botid` deep verification on `POST /api/ai-edit`
- [ ] Sliding-window rate limit per IP via Vercel Runtime Cache API
- [ ] Security headers (CSP, X-Content-Type-Options, Referrer-Policy)
- [ ] `vercel.ts` (replaces `vercel.json`) with cron + cache-control headers

## Phase 6 — Deploy + observability + agent (prep-doc: Speed Insights, Web Analytics, Vercel Agent)

- [ ] `@vercel/speed-insights` wired
- [ ] Deploy to Vercel; verify Web Analytics + Speed Insights show data
- [ ] Enable Vercel Agent code review on the GitHub repo
- [ ] README walk-through of every architectural decision

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

_(empty — populated as we execute)_
