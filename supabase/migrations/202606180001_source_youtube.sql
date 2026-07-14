-- Add 'youtube' to the source check constraints so YouTube videos can be saved as
-- learning bookmarks in the Library (resolved via oEmbed, not Apify).
alter table public.posts drop constraint if exists posts_source_check;
alter table public.posts
  add constraint posts_source_check
  check (source in ('x', 'threads', 'ig', 'youtube'));

alter table public.competitors drop constraint if exists competitors_source_check;
alter table public.competitors
  add constraint competitors_source_check
  check (source in ('x', 'threads', 'ig', 'youtube'));
