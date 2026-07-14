-- Phase 2.5 (Purpose): classify each saved link by content purpose, and cache the
-- per-purpose generated text artifact (Reel script / swipe breakdown / research note /
-- carousel meta-prompt).
alter table public.posts
  add column if not exists purpose text not null default 'inbox'
  check (purpose in ('reel', 'carousel', 'swipe', 'research', 'business', 'inbox'));

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
