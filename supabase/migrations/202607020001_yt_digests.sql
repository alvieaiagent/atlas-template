-- YT 收錄器（04）工具頁/yt-digest）嘅收錄庫。獨立 table，Atlas 唔讀寫，
-- 只係共用同一個 Supabase project。冇 RLS policy = 淨係 service role 掂到。
-- idempotent：呢個 migration 可能已經由 management API 行咗一次。
create table if not exists public.yt_digests (
  id uuid primary key default gen_random_uuid(),
  url text not null unique,
  video_id text,
  title text not null,
  channel text,
  lang text,
  summary text,
  key_points jsonb not null default '[]'::jsonb,
  article text,
  tags jsonb not null default '[]'::jsonb,
  model text,
  created_at timestamptz not null default now()
);

alter table public.yt_digests enable row level security;

create index if not exists yt_digests_created_at_idx
  on public.yt_digests (created_at desc);

-- digest.js upsert 用 on_conflict=video_id（同一條片唔同 URL 形式都 dedupe 到）
create unique index if not exists yt_digests_video_id_key
  on public.yt_digests (video_id);
