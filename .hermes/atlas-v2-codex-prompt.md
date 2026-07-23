# Atlas V2 — Codex Build Prompt (v2, repo-grounded)

You are Codex building Atlas V2 for Alvie in `/Users/alvie/Hermes Codex/atlas-template`.

Apply these installed skills explicitly:
- **@ponytail** — lazy senior engineer: smallest working implementation, reuse existing code, no new abstractions, boring proven tools, ship verifiable behavior.
- **@karpathy-guidelines** — state assumptions, surgical changes, never hallucinate success, verify with real commands and actual app behavior.
- **@ui-ux-pro-max** (or nearest UI skill) — clean premium executive dashboard.
- Addy Osmani skills if available: spec-driven-development, frontend-ui-engineering, code-review-and-quality, code-simplification.

---

## 0. STATE — YOU ARE RESUMING, NOT STARTING (verified 2026-07-23)

Work is already in progress in this repo. Before writing any code:

1. Read your existing plan: `.hermes/plans/atlas-v2-smallest-safe.md`. Follow it. Do not rewrite it unless it contradicts this prompt.
2. Run `git status` and `git diff`. Uncommitted work already in the tree:
   - `src/components/app/sidebar.tsx` — V2 nav (Today / Signals / Daily Learnings / Knowledge Bank / Archive / People-Watchlist / Settings) + light restyle (white bg, slate text). Keep and finish it.
   - `src/lib/strategic-intelligence.ts` (161 lines, new) — already contains `LEARNING_AREAS`, `WORTH_TAGS`, `RECOMMENDED_ACTIONS`, `CRAWL_BUDGET_MODES`, `WATCHLIST_PRIORITIES`, `JaniceSummary` / `DailySummary` types. **Phase 2 constants are largely done. Reuse this file — do not regenerate it.**
3. `main` is ahead of `origin/main` by 1 commit. Do not push until a phase passes verification.

## 0b. REPO FACTS (verified — do not re-derive, do not contradict)

- Stack: **pnpm** · Next.js 15.5 App Router · React 19 · Tailwind 4 · Supabase (`@supabase/ssr`) · Apify · vitest · zod. Per `AGENTS.md`: this Next.js version has breaking changes — read `node_modules/next/dist/docs/` before writing Next code.
- Existing routes: `(dashboard)`: `/`, `/inspiration`, `/library`, `/marked`, `/radar`, `/competitors`, `/settings`; plus `/capture`, `/login`.
- API routes: `/api/refresh`, `/api/refresh/radar`, `/api/cron/refresh`, `/api/cron/radar`, `/api/img`, `/api/language`.
- `vercel.json` crons: `[]` — no cron deployed today.
- Key lib to reuse: `src/lib/actions.ts`, `data.ts`, `link-source.ts` (link/source detection), `mock-data.ts`, `mappers.ts`, `scraping/`, `integrations/`, `database.types.ts`, `supabase/`. Components: `sidebar.tsx`, `language-toggle.tsx`, `usage-guide.tsx` (reuse for per-page 操作指引), `mock-mode-banner.tsx`, `source-toggles.tsx`.
- Supabase migrations run through `202607020001_yt_digests.sql` — YouTube digest support already exists; reuse it for YouTube Quick Capture. Existing schema features: post_url, added_via, post_scripts, purpose_outputs, competitors, purpose_cheatsheet, sources (youtube/facebook/web_note/xiaohongshu), post_used, yt_digests.
- Language system: `Language = en | yue` cookie via `/api/language`. Every new page must supply both languages.

## 0c. NAV DECISION — /marked and /radar

Your sidebar diff removes Marked and AI Radar from nav. That is acceptable **only** under these rules:
- Do NOT delete `/marked` or `/radar` pages, or `/api/cron/radar` / `/api/refresh/radar`. They stay URL-reachable and functional.
- Marked-post behavior folds conceptually under Knowledge Bank; do not break the underlying marked/used data.
- If keeping them in nav is lower-risk, add them under a secondary "More" group instead.

---

## 1. PRODUCT DIRECTION

Atlas V2 = **Alvie's Strategic Intelligence System + Knowledge Bank.**

It is NOT: a Pokémon-only dashboard · a marketplace scraper · an influencer posting calendar · a generic inspiration database · a fake polished UI demo.

It IS:
- a private system that captures, crawls, summarizes, classifies, and saves useful internet signals
- a Janice-powered executive briefing system
- a Knowledge Bank / POV Bank for career, business, CityU, AI, content creation, partnership thinking
- credit-conscious: weekly cron + manual force refresh + priority watchlists — never daily auto-crawl

User context: Alvie is not posting publicly yet. Atlas exists so she does not read everything manually: capture link → Janice summary → implication for her → save what's worth keeping.

## 2. JANICE RULE (only analysis lens)

No Scout / Operator / Skeptic / sub-agent POV sections / "as an AI agent" language. Every summary uses exactly this structure:

**Executive Summary** (3–5 lines) → **Key Points** → **Highlights** (useful/smart/timely) → **Lowlights** (weak/generic/noisy) → **Flags** (hype, weak assumptions, fact-check needed, competitor risk, unclear adoption) → **Implication for Alvie** (career / business / CityU / AI / content / partnership) → **Recommended Action** (one of `RECOMMENDED_ACTIONS` in strategic-intelligence.ts) → **Sources Used**.

Tone: direct, executive, implication-focused, blunt about weak signals, honest about missing data.

## 3. UI RULES (all new/reshaped V2 pages)

White background · blue/black/grey text · Helvetica/system font · **bold key messages** · executive, minimal clutter · little/no unnecessary scrolling · mobile + desktop responsive · no gradients (or extremely subtle only) · EN/廣東話 toggle stays visible · no dark styling on new V2 pages (dark may remain temporarily on untouched legacy pages if gradual migration is safer — the sidebar light restyle already started; be consistent with it).

## 4. LIFECYCLE MODEL

- **Active Signals** = crawled/fetched within last 90 days.
- **Archive** = older unsaved crawls + historical daily/weekly summaries. View/filter first — never destructive deletion unless schema already safely supports hide/delete.
- **Knowledge Bank** = saved items, kept forever regardless of age.

---

## PHASE 1 — IA / UI SHELL

Nav (already in your sidebar diff): Today `/` · Signals `/inspiration` (repositioned copy) · Daily Learnings `/learnings` · Knowledge Bank `/library` (repositioned copy) · Archive `/archive` · People / Watchlist `/competitors` (reshaped) · Settings `/settings`.

Do not break: login middleware, language toggle, Library capture (LinkPasteBox or equivalent), Inspiration refresh, Supabase helpers, Apify functions, existing server actions.

**1. Today (`/`)** — executive start page. Sections: Today's Strategic Brief · Quick Capture (paste link or raw note) · Recent High-Value Signals · Janice Flags · Worth Remembering Queue · Crawl Budget Snapshot · Watchlist Refresh Shortcuts. CTAs: Generate/View Strategic Brief · Paste Link/Note · Save to Knowledge Bank · Force Refresh Selected Watchlist.

**2. Daily Learnings hub (`/learnings`)** — Janice Executive Summary shell · simple date selector · 6 learning-area cards (from `LEARNING_AREAS`) · completion/status per area · link to past days/archive · clear usage explanation.

**3. Learning subpages** — `/learnings/[slug]` dynamic route (simplest) for the 6 slugs already in `LEARNING_AREAS`. Each shows daily/weekly entries grouped by date using the full Janice structure from §2.

**4. Signals (`/inspiration`, repositioned)** — keep existing refresh/feed behavior. Add repositioned copy + quick actions: force refresh a source · paste a link · check API/env status.

**5. Knowledge Bank (`/library`, repositioned copy)** — preserve paste-link box, raw note saving, YouTube/web/social links, existing purpose/category filters. Add worth tags from `WORTH_TAGS`. Saved items never expire from view.

**6. Archive (`/archive`, new)** — filters: date range · source · learning area · worth tag · keyword · Janice verdict · used/unused · saved/unsaved. Card actions: Save to Knowledge Bank · Restore to Active (only if schema supports cleanly) · hide/delete only if existing model safely supports it, otherwise leave out.

**7. People / Watchlist (`/competitors`, reshaped)** — support YouTube channels, IG creators, X, Threads, websites/blogs. Each item: name · platform · URL/handle · priority (`WATCHLIST_PRIORITIES`) · learning area · notes · last refreshed · next suggested refresh · force-refresh button/shell. If full persistence is too much this pass, ship typed fallback/config + UI shell, clearly labeled.

Every key tab gets a 操作指引 block (reuse `usage-guide.tsx`): what this page is for · when to use it · next action · what output Alvie gets.

## PHASE 2 — TYPES / DATA / PERSISTENCE

Constants/types already exist in `src/lib/strategic-intelligence.ts` — extend, don't duplicate. Inspect `database.types.ts` + `supabase/migrations` before any schema change; prefer minimal additive changes.

If adding persistence is safe: `daily_summaries` table (id, date_hkt, learning_area, executive_summary, key_points, highlights, lowlights, flags, implication_for_alvie, recommended_action, source_post_ids, sources_used, created_at, updated_at) and post metadata (learning_area, worth_tags, janice_summary, janice_verdict, saved_to_knowledge_bank, archived_at/hidden_from_active, used_at — note `post_used` migration already exists, reuse it).

If DB migration is too risky this pass: typed fallback data helper, clearly labeled as fallback/sample, TODO comments with exact schema recommendations. **Never present fallback data as real.**

## PHASE 3 — CRAWL CADENCE / SETTINGS

**No daily cron. Ever.** Default: Conservative or Manual Only.

- Weekly: Friday 9:00am HKT = `0 1 * * 5` UTC. Optional Balanced adds Tuesday `0 1 * * 2`.
- `vercel.json` crons is currently `[]`. Only add a cron entry if `/api/cron/refresh`-style endpoint has a safe auth model you have verified. If uncertain, leave crons `[]` and put copy in Settings recommending Manual Only / Friday weekly.
- Settings page: render the 4 modes from `CRAWL_BUDGET_MODES` (cadence + scope text already written there).
- Force refresh is the primary lever. Buttons/shells: Refresh All P0 Watchlist · Refresh YouTube Channels · Refresh Instagrammers · Refresh This Creator · Refresh This Source · Refresh This Learning Area. Each explains scope before running (e.g. "Will crawl latest 3 videos from 5 YouTube channels"). Show scope, never fake cost estimates.

**Source rules:** YouTube — Quick Capture paste-link first (detect via `link-source.ts`, reuse `yt_digests`); no broad channel crawl. Instagram — manual force refresh default, weekly for P0 only, latest 6–12 posts. X/Threads — weekly or twice-weekly, conservative limits (recent commits already normalize Threads results — reuse).

## QUICK CAPTURE FLOW

On Today + Knowledge Bank (+ header if trivial). Flow: paste link/note → detect source (`link-source.ts`) → resolve metadata/transcript if existing integrations allow → Janice summary if Gemini/API env exists → apply/ask worth tags → save to Knowledge Bank. If API/fetch/transcript fails: show honest status, never fake a summary, save the raw link/note if possible.

---

## IMPLEMENTATION ORDER & DISCIPLINE

1. Read plan + diff (§0). 2. Update the plan file only if this prompt changes it. 3. Phase 1 → verify → **commit**. 4. Phase 2 → verify → **commit**. 5. Phase 3 → verify → **commit**. Small commits, one concern each. Do not push or deploy unless explicitly asked.

**Verification per phase (run for real, paste actual output):**
- `./node_modules/.bin/tsc --noEmit --pretty false`
- `pnpm test` (vitest run)
- `pnpm lint`
- `pnpm build`
- Browser QA on local dev server: `/`, `/learnings`, all 6 subpage slugs, `/library`, `/archive`, `/settings`, `/inspiration`, `/competitors`, plus `/marked` and `/radar` still load. Check: no horizontal scroll (`document.documentElement.scrollWidth === document.documentElement.clientWidth`) · white bg + blue/black/grey + Helvetica on V2 pages · Quick Capture visible · Janice summary UI visible · EN/廣東話 toggle works both ways on new pages.

If a command doesn't exist, say exactly why and run the nearest equivalent. Never claim Supabase/Apify/Gemini works unless verified through real logs/UI/API responses.

## FINAL REPORT

1. What changed 2. Files changed 3. Real vs fallback/sample (explicit list) 4. How to run locally 5. Verification commands + actual results 6. Cron status (daily disabled confirmed; weekly enabled or not + reason) 7. Watchlist/force-refresh status (real endpoint vs UI shell) 8. Remaining blockers/risks 9. Next recommended phase.

## NON-NEGOTIABLES

- No Pokémon-only / marketplace-only drift.
- Never remove Library paste-link / Quick Capture or existing working crawl/save behavior.
- Never delete `/marked`, `/radar`, or their API routes this pass.
- Never fake data, summaries, Apify runs, Supabase writes, Gemini outputs, or build/test results.
- No daily cron. No credit burn. No sub-agent POVs. No overbuilding. No stopping at UI polish.
- No production-verified claims without actual verification.

Start now: `git status` + `git diff`, read `.hermes/plans/atlas-v2-smallest-safe.md`, then continue the smallest production-safe Atlas V2 from where the uncommitted work left off.
