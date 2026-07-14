-- Atlas — all-in-one cloud setup (run once in Supabase SQL Editor)
-- migrations (in order) + seed. Safe to re-run (idempotent).

-- ============================================================
-- migrations/202606030001_initial_schema.sql
-- ============================================================
create extension if not exists "pgcrypto";

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#38bdf8',
  keywords text[] not null default '{}',
  accounts text[] not null default '{}',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('x', 'threads', 'ig', 'youtube', 'facebook')),
  external_id text not null unique,
  author_handle text not null,
  author_name text not null,
  verified boolean not null default false,
  text text not null,
  media jsonb not null default '[]'::jsonb,
  engagement jsonb not null default '{}'::jsonb,
  posted_at timestamptz not null,
  category_ids uuid[] not null default '{}',
  fetched_at timestamptz not null default now()
);

create table if not exists public.marked_posts (
  post_id uuid primary key references public.posts(id) on delete cascade,
  marked_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'shot', 'rejected')),
  notes text
);

create table if not exists public.scrape_cursors (
  source text not null check (source in ('x', 'threads', 'ig', 'youtube')),
  category_id uuid not null references public.categories(id) on delete cascade,
  last_cursor text,
  last_run_at timestamptz,
  primary key (source, category_id)
);

create index if not exists categories_sort_order_idx on public.categories(sort_order);
create index if not exists posts_posted_at_idx on public.posts(posted_at desc);
create index if not exists posts_source_idx on public.posts(source);
create index if not exists posts_category_ids_idx on public.posts using gin(category_ids);
create index if not exists marked_posts_marked_at_idx on public.marked_posts(marked_at desc);

alter table public.categories enable row level security;
alter table public.posts enable row level security;
alter table public.marked_posts enable row level security;
alter table public.scrape_cursors enable row level security;

create policy "Authenticated users can read categories"
  on public.categories for select
  to authenticated
  using (true);

create policy "Authenticated users can manage categories"
  on public.categories for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can read posts"
  on public.posts for select
  to authenticated
  using (true);

create policy "Authenticated users can manage marked posts"
  on public.marked_posts for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can read cursors"
  on public.scrape_cursors for select
  to authenticated
  using (true);

create policy "Service role can manage posts"
  on public.posts for all
  to service_role
  using (true)
  with check (true);

create policy "Service role can manage cursors"
  on public.scrape_cursors for all
  to service_role
  using (true)
  with check (true);

-- ============================================================
-- migrations/202606040001_add_post_url.sql
-- ============================================================
-- Phase 2: persist the canonical post URL.
-- Mark and link-capture flows need a real
-- permalink instead of deriving one at runtime. Nullable so older rows and mock mode stay valid.
alter table public.posts
  add column if not exists url text;

-- ============================================================
-- migrations/202606040003_add_post_added_via.sql
-- ============================================================
-- Phase 2.5 (Library): distinguish posts pulled from the keyword/account scrape feed from
-- posts a user pasted in by link. 'scrape' (default) keeps existing rows in the feed;
-- 'manual' rows are the pasted inspiration library.
alter table public.posts
  add column if not exists added_via text not null default 'scrape'
  check (added_via in ('scrape', 'manual'));

create index if not exists posts_added_via_idx on public.posts(added_via);

-- ============================================================
-- migrations/202606040004_authenticated_post_writes.sql
-- ============================================================
-- Phase 2.5: the initial schema only let service_role write posts, but Mark and the paste
-- Library upsert posts using the logged-in (authenticated) client. Allow authenticated
-- inserts/updates so persistence works. Idempotent via drop-if-exists.
drop policy if exists "Authenticated users can insert posts" on public.posts;
create policy "Authenticated users can insert posts"
  on public.posts for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated users can update posts" on public.posts;
create policy "Authenticated users can update posts"
  on public.posts for update
  to authenticated
  using (true)
  with check (true);

-- ============================================================
-- migrations/202606150001_post_scripts.sql
-- ============================================================
-- Phase 2.5 (Scripts): per-post 第一份 caption + 第二份 逐字稿 (Gemini video transcript),
-- cached so we don't re-transcribe (and because the IG video URL expires quickly).
create table if not exists public.post_scripts (
  post_id uuid primary key references public.posts(id) on delete cascade,
  caption text,
  transcript text,
  model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.post_scripts enable row level security;

drop policy if exists "Authenticated manage post_scripts" on public.post_scripts;
create policy "Authenticated manage post_scripts"
  on public.post_scripts for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Service role manage post_scripts" on public.post_scripts;
create policy "Service role manage post_scripts"
  on public.post_scripts for all
  to service_role
  using (true)
  with check (true);

-- ============================================================
-- migrations/202606150002_post_purpose_outputs.sql
-- ============================================================
-- Phase 2.5 (Purpose): classify each saved link by content purpose, and cache the
-- per-purpose generated text artifact (Reel script / swipe breakdown / research note /
-- carousel meta-prompt).
alter table public.posts
  add column if not exists purpose text not null default 'inbox';

-- 'cheatsheet' (一頁攻略圖) added 2026-06-17 for the 3-way Mark.
alter table public.posts drop constraint if exists posts_purpose_check;
alter table public.posts
  add constraint posts_purpose_check
  check (purpose in ('reel', 'carousel', 'cheatsheet', 'swipe', 'research', 'business', 'inbox'));

create index if not exists posts_purpose_idx on public.posts(purpose);

create table if not exists public.post_outputs (
  post_id uuid not null references public.posts(id) on delete cascade,
  kind text not null,
  content text not null,
  model text,
  updated_at timestamptz not null default now(),
  primary key (post_id, kind)
);

alter table public.post_outputs enable row level security;

drop policy if exists "Authenticated manage post_outputs" on public.post_outputs;
create policy "Authenticated manage post_outputs"
  on public.post_outputs for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Service role manage post_outputs" on public.post_outputs;
create policy "Service role manage post_outputs"
  on public.post_outputs for all
  to service_role
  using (true)
  with check (true);

-- ============================================================
-- seed.sql
-- ============================================================
-- Default categories (keep in sync with src/lib/default-categories.ts). Fixed UUIDs make
-- this non-destructive: re-running upserts these rows by id and leaves user categories alone.
insert into public.categories (
  id,
  name,
  color,
  keywords,
  accounts,
  sort_order
) values
  (
    '22222222-2222-4222-8222-222222222222',
    'Prompt Engineering',
    '#a855f7',
    array['prompt engineering', 'prompt', 'system prompt', 'context engineering'],
    array[]::text[],
    1
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'AI Video',
    '#f97316',
    array['sora', 'veo', 'runway', 'pika', 'kling'],
    array['runwayml', 'pika_labs'],
    2
  ),
  (
    '11111111-1111-4111-8111-111111111111',
    'AI Code',
    '#38bdf8',
    array['claude code', 'cursor', 'cline', 'lovable'],
    array['anthropicai', 'cursor_ai'],
    3
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    'AI Image',
    '#ec4899',
    array['midjourney', 'flux', 'nano banana'],
    array[]::text[],
    4
  ),
  (
    '55555555-5555-4555-8555-555555555555',
    'AI Tools',
    '#22c55e',
    array['ai tool', 'new ai', 'ai app', 'ai agent'],
    array[]::text[],
    5
  ),
  (
    '66666666-6666-4666-8666-666666666666',
    'Carousel Inspiration',
    '#eab308',
    array['carousel', 'swipe', 'infographic'],
    array[]::text[],
    6
  ),
  (
    '77777777-7777-4777-8777-777777777777',
    'IG Story 漏斗',
    '#ef4444',
    array['story', 'funnel', 'lead magnet'],
    array[]::text[],
    7
  )
on conflict (id) do update set
  name = excluded.name,
  color = excluded.color,
  keywords = excluded.keywords,
  accounts = excluded.accounts,
  sort_order = excluded.sort_order;

insert into public.posts (
  source,
  external_id,
  author_handle,
  author_name,
  verified,
  text,
  media,
  engagement,
  posted_at,
  category_ids,
  fetched_at,
  url
) values
(
  'threads',
  'seed:threads:claude-code-agent-loop',
  'anthropicai',
  'Anthropic',
  true,
  'Claude Code agents are becoming the default workflow for shipping small internal tools: inspect the repo, make the change, verify, then commit.',
  '[]'::jsonb,
  '{"play": 18400, "like": 932, "comment": 68, "save": 211, "share": 74}'::jsonb,
  now() - interval '2 hours',
  array['11111111-1111-4111-8111-111111111111'::uuid],
  now(),
  'https://www.threads.net/@anthropicai/post/seed-claude-code-agent-loop'
),
(
  'x',
  'seed:x:cursor-claude-code',
  'cursor_ai',
  'Cursor',
  true,
  'Cursor plus Claude Code is strongest when the AI owns one narrow diff and the human owns acceptance. Smaller work orders beat vague prompts.',
  '[]'::jsonb,
  '{"play": 9200, "like": 511, "comment": 42, "save": 128, "share": 35}'::jsonb,
  now() - interval '6 hours',
  array['11111111-1111-4111-8111-111111111111'::uuid],
  now(),
  'https://x.com/cursor_ai/status/1750000000001'
),
(
  'ig',
  'seed:ig:cline-short-demo',
  'cline_ai',
  'Cline',
  false,
  'A short demo shows Cline turning a bug report into a passing test and a patch. The creator angle: AI engineers need crisp review loops.',
  '[{"type":"image","url":"https://picsum.photos/seed/atlas-cline/1200/675"}]'::jsonb,
  '{"play": 55200, "like": 2810, "comment": 144, "save": 508, "share": 233}'::jsonb,
  now() - interval '18 hours',
  array['11111111-1111-4111-8111-111111111111'::uuid],
  now(),
  'https://www.instagram.com/p/SeedClineDemo/'
),
(
  'threads',
  'seed:threads:anthropic-release-note',
  'anthropicai',
  'Anthropic',
  true,
  'Anthropic developers are using Claude Code as a coordination layer: notes become tasks, tasks become diffs, diffs become verified commits.',
  '[]'::jsonb,
  '{"play": 12400, "like": 702, "comment": 51, "save": 166, "share": 49}'::jsonb,
  now() - interval '2 days',
  array['11111111-1111-4111-8111-111111111111'::uuid],
  now(),
  'https://www.threads.net/@anthropicai/post/seed-anthropic-release-note'
),
(
  'x',
  'seed:x:work-order-pattern',
  'ai_content_lab',
  'AI Content Lab',
  false,
  'The prompt pattern that keeps Claude Code reliable: one work order, one owner, one acceptance test, one commit. Boring is the point.',
  '[]'::jsonb,
  '{"play": 6800, "like": 388, "comment": 21, "save": 95, "share": 28}'::jsonb,
  now() - interval '5 days',
  array['11111111-1111-4111-8111-111111111111'::uuid],
  now(),
  'https://x.com/ai_content_lab/status/1750000000002'
),
(
  'ig',
  'seed:ig:ai-code-carousel',
  'buildwithai',
  'Build With AI',
  false,
  'Carousel idea: from prompt to production. Slide 1 asks what happens when your AI can read the whole repo; slide 10 asks viewers to save the workflow.',
  '[{"type":"image","url":"https://picsum.photos/seed/atlas-carousel/1200/675"}]'::jsonb,
  '{"play": 31400, "like": 1730, "comment": 82, "save": 402, "share": 119}'::jsonb,
  now() - interval '9 days',
  array['11111111-1111-4111-8111-111111111111'::uuid],
  now(),
  'https://www.instagram.com/p/SeedAiCodeCarousel/'
) on conflict (external_id) do update set
  source = excluded.source,
  author_handle = excluded.author_handle,
  author_name = excluded.author_name,
  verified = excluded.verified,
  text = excluded.text,
  media = excluded.media,
  engagement = excluded.engagement,
  posted_at = excluded.posted_at,
  category_ids = excluded.category_ids,
  fetched_at = excluded.fetched_at,
  url = excluded.url;

-- ============================================================
-- migrations/202606180002_source_facebook.sql
-- ============================================================
alter table public.posts drop constraint if exists posts_source_check;
alter table public.posts
  add constraint posts_source_check
  check (source in ('x', 'threads', 'ig', 'youtube', 'facebook'));

do $$
begin
  if to_regclass('public.competitors') is not null then
    alter table public.competitors drop constraint if exists competitors_source_check;
    alter table public.competitors
      add constraint competitors_source_check
      check (source in ('x', 'threads', 'ig', 'youtube', 'facebook'));
  end if;
end $$;
