-- Add 'facebook' to source check constraints so public Facebook posts can be
-- saved manually in the Library.
alter table public.posts drop constraint if exists posts_source_check;
alter table public.posts
  add constraint posts_source_check
  check (source in ('x', 'threads', 'ig', 'youtube', 'facebook'));

alter table public.competitors drop constraint if exists competitors_source_check;
alter table public.competitors
  add constraint competitors_source_check
  check (source in ('x', 'threads', 'ig', 'youtube', 'facebook'));
