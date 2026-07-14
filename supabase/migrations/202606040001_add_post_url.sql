-- Phase 2: persist the canonical post URL.
-- Mark and link-capture flows need a real
-- permalink instead of deriving one at runtime. Nullable so older rows and mock mode stay valid.
alter table public.posts
  add column if not exists url text;
