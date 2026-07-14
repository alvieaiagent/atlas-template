-- "已經使用" flag: mark Library content already used (made a Reel/carousel
-- from it) so he can tell at a glance what's still untapped.
alter table public.posts
  add column if not exists used boolean not null default false;
