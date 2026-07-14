-- Competitor accounts to watch (the author of any saved post can be tracked).
create table if not exists public.competitors (
  source text not null check (source in ('x', 'threads', 'ig')),
  handle text not null,
  name text,
  added_at timestamptz not null default now(),
  primary key (source, handle)
);

alter table public.competitors enable row level security;

drop policy if exists "Authenticated manage competitors" on public.competitors;
create policy "Authenticated manage competitors"
  on public.competitors for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Service role manage competitors" on public.competitors;
create policy "Service role manage competitors"
  on public.competitors for all
  to service_role
  using (true)
  with check (true);
