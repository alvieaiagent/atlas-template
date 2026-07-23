# Atlas V2 smallest safe plan

## Assumptions
- Keep existing Next.js App Router, Supabase helpers, Apify `/api/refresh`, language cookie, and Library `LinkPasteBox` flow.
- No DB migration in this pass; add typed strategic-intelligence constants and honest fallback/sample data only.
- Existing `vercel.json` has no cron; leave daily disabled and weekly not enabled until a safe authenticated cron endpoint exists.
- Existing UI is dark; for V2, migrate dashboard shell/components touched by new pages to a light executive style without rewriting every post-card detail.

## Files to change
- `src/lib/types.ts` and new `src/lib/strategic-intelligence.ts` for constants/fallback data.
- `src/components/app/sidebar.tsx`, `src/components/app/usage-guide.tsx`, `src/app/(dashboard)/layout.tsx`, `src/app/globals.css` for V2 IA/light shell.
- `src/app/page.tsx` for Today.
- New `src/app/(dashboard)/learnings/page.tsx` and `src/app/(dashboard)/learnings/[slug]/page.tsx`.
- New `src/app/(dashboard)/archive/page.tsx`.
- Reshape `src/app/(dashboard)/library/page.tsx`, `src/app/(dashboard)/inspiration/page.tsx`, `src/app/(dashboard)/competitors/page.tsx`, `src/app/(dashboard)/settings/page.tsx` copy/UI shells.

## Risky areas
- Do not touch login middleware, Supabase client setup, Apify normalizers, or Library save actions except copy/UI usage.
- DB metadata requested by spec may not exist; avoid querying non-existent columns.
- Force refresh remains existing `/api/refresh`; new scoped buttons are UI shells unless existing endpoint supports the scope.

## Verification commands
- `./node_modules/.bin/tsc --noEmit --pretty false`
- `./node_modules/.bin/vitest run`
- `./node_modules/.bin/eslint`
- `./node_modules/.bin/next build`
- Start local server and browser QA `/`, `/learnings`, all 6 learning routes, `/library`, `/archive`, `/settings`, `/inspiration`, `/competitors` for no horizontal scroll, light brand, Quick Capture, Janice UI, EN/廣東話 toggle.
