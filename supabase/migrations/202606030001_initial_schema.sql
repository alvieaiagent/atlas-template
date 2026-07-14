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
  source text not null check (source in ('x', 'threads', 'ig')),
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
  source text not null check (source in ('x', 'threads', 'ig')),
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
