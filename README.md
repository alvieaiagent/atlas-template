# Atlas — Inspiration Dashboard (Template)

A private, single-user content-inspiration dashboard. Scrape X / Threads / IG / Facebook / YouTube / Xiaohongshu posts into Supabase, browse and filter them, mark the best ones as content ideas, and (optionally) generate scripts and outlines with Gemini.

> 🇭🇰 **中文逐步教學：睇 [SETUP.md](SETUP.md)** — 一步步教你由零部署（可以直接掉俾你嘅 Claude Code 幫你行）。

## Features

- **Inspiration feed** — scraped posts, filter by category / source / time, grid or list view
- **AI Radar** — free RSS/API sources + optional X scraping, Cantonese one-line curation via Gemini
- **Mark** — save a post as a Carousel / Reel / cheatsheet idea (writes to Supabase)
- **Library** — paste any link to capture it; auto-classify with Gemini
- **Competitors** — track specific accounts
- **Mock mode** — runs with zero env vars using bundled mock data, so you can try the UI before setting anything up

## Stack

Next.js 15 · React 19 · TypeScript · Tailwind v4 · Supabase (Postgres) · Apify (scraping) · Gemini (optional AI) · Vercel

## Quick start

```bash
pnpm install
pnpm dev          # mock mode — no env needed
```

To go live:

1. Create a [Supabase](https://supabase.com) project → SQL Editor → paste and run `supabase/cloud-setup.sql`
2. `cp env.example .env.local` and fill in `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE`
3. `pnpm check:env` to verify, then `pnpm dev`
4. Optional: add `APIFY_TOKEN` (scraping) and `GEMINI_API_KEY` (AI features)
5. Deploy to Vercel and set `ATLAS_PASSWORD` to lock the app behind a password

## Environment variables

See [env.example](env.example). Everything except the Supabase keys is optional — features degrade gracefully when a key is missing.

## License

MIT — fork it, deploy it, make it yours.
