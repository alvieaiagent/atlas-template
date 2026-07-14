-- Add 'web' (any website link) and 'note' (raw pasted text) to the source check
-- constraints so Atlas becomes a universal capture inbox, not just social posts.
alter table public.posts drop constraint if exists posts_source_check;
alter table public.posts
  add constraint posts_source_check
  check (source in ('x', 'threads', 'ig', 'youtube', 'facebook', 'web', 'note'));

alter table public.competitors drop constraint if exists competitors_source_check;
alter table public.competitors
  add constraint competitors_source_check
  check (source in ('x', 'threads', 'ig', 'youtube', 'facebook', 'web', 'note'));
