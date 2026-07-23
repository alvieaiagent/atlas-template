-- Atlas V2 Strategic Intelligence persistence.
-- Additive only: no destructive deletes, no cron, no existing route removal.

alter table public.posts
  add column if not exists learning_area text,
  add column if not exists worth_tags text[] not null default '{}',
  add column if not exists janice_summary jsonb,
  add column if not exists janice_verdict text,
  add column if not exists saved_to_knowledge_bank boolean not null default false,
  add column if not exists archived_at timestamptz,
  add column if not exists hidden_from_active boolean not null default false,
  add column if not exists used_at timestamptz;

create table if not exists public.daily_summaries (
  id uuid primary key default gen_random_uuid(),
  date_hkt date not null,
  learning_area text not null,
  executive_summary text not null,
  key_points jsonb not null default '[]'::jsonb,
  highlights jsonb not null default '[]'::jsonb,
  lowlights jsonb not null default '[]'::jsonb,
  flags jsonb not null default '[]'::jsonb,
  implication_for_alvie text not null,
  recommended_action text not null,
  source_post_ids uuid[] not null default '{}',
  sources_used jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (date_hkt, learning_area)
);

alter table public.daily_summaries enable row level security;

create policy "Authenticated users can read daily summaries"
  on public.daily_summaries for select
  to authenticated
  using (true);

create policy "Service role can manage daily summaries"
  on public.daily_summaries for all
  to service_role
  using (true)
  with check (true);

create index if not exists posts_learning_area_idx on public.posts (learning_area);
create index if not exists posts_worth_tags_idx on public.posts using gin(worth_tags);
create index if not exists posts_saved_to_knowledge_bank_idx on public.posts (saved_to_knowledge_bank);
create index if not exists posts_archived_at_idx on public.posts (archived_at desc);
create index if not exists daily_summaries_date_hkt_idx on public.daily_summaries (date_hkt desc);
create index if not exists daily_summaries_learning_area_idx on public.daily_summaries (learning_area);
