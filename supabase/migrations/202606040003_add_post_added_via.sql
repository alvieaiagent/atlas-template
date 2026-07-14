-- Phase 2.5 (Library): distinguish posts pulled from the keyword/account scrape feed from
-- posts a user pasted in by link. 'scrape' (default) keeps existing rows in the feed;
-- 'manual' rows are the pasted inspiration library.
alter table public.posts
  add column if not exists added_via text not null default 'scrape'
  check (added_via in ('scrape', 'manual'));

create index if not exists posts_added_via_idx on public.posts(added_via);
