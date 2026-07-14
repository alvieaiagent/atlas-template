-- Add 'xiaohongshu' (小紅書 / RED, captured free from share-link embedded JSON) to the
-- source check constraints.
alter table public.posts drop constraint if exists posts_source_check;
alter table public.posts
  add constraint posts_source_check
  check (source in ('x', 'threads', 'ig', 'youtube', 'facebook', 'web', 'note', 'xiaohongshu'));

alter table public.competitors drop constraint if exists competitors_source_check;
alter table public.competitors
  add constraint competitors_source_check
  check (source in ('x', 'threads', 'ig', 'youtube', 'facebook', 'web', 'note', 'xiaohongshu'));
