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
