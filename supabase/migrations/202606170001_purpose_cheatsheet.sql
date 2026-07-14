-- Add 'cheatsheet' (一頁攻略圖) to the posts.purpose check constraint so the
-- 3-way Mark (Carousel / Reel / 一頁攻略圖) can tag a post as a cheatsheet.
alter table public.posts drop constraint if exists posts_purpose_check;
alter table public.posts
  add constraint posts_purpose_check
  check (purpose in ('reel', 'carousel', 'cheatsheet', 'swipe', 'research', 'business', 'inbox'));
