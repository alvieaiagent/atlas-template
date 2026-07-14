-- Default categories (keep in sync with src/lib/default-categories.ts). Fixed UUIDs make
-- this non-destructive: re-running upserts these rows by id and leaves user categories alone.
insert into public.categories (
  id,
  name,
  color,
  keywords,
  accounts,
  sort_order
) values
  (
    '22222222-2222-4222-8222-222222222222',
    'Prompt Engineering',
    '#a855f7',
    array['prompt engineering', 'prompt', 'system prompt', 'context engineering'],
    array[]::text[],
    1
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'AI Video',
    '#f97316',
    array['sora', 'veo', 'runway', 'pika', 'kling'],
    array['runwayml', 'pika_labs'],
    2
  ),
  (
    '11111111-1111-4111-8111-111111111111',
    'AI Code',
    '#38bdf8',
    array['claude code', 'cursor', 'cline', 'lovable'],
    array['anthropicai', 'cursor_ai'],
    3
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    'AI Image',
    '#ec4899',
    array['midjourney', 'flux', 'nano banana'],
    array[]::text[],
    4
  ),
  (
    '55555555-5555-4555-8555-555555555555',
    'AI Tools',
    '#22c55e',
    array['ai tool', 'new ai', 'ai app', 'ai agent'],
    array[]::text[],
    5
  ),
  (
    '66666666-6666-4666-8666-666666666666',
    'Carousel Inspiration',
    '#eab308',
    array['carousel', 'swipe', 'infographic'],
    array[]::text[],
    6
  ),
  (
    '77777777-7777-4777-8777-777777777777',
    'IG Story 漏斗',
    '#ef4444',
    array['story', 'funnel', 'lead magnet'],
    array[]::text[],
    7
  ),
  (
    'a1aa0001-0001-4001-8001-000000000001',
    '🛰️ Radar・News',
    '#0ea5e9',
    array[]::text[],
    array['rundownai', 'mreflow', '_akhaliq', 'testingcatalog', 'fofrai', 'producthunt', 'officiallogank', 'simonw'],
    100
  ),
  (
    'a1aa0002-0002-4002-8002-000000000002',
    '🛰️ Radar・Labs',
    '#6366f1',
    array[]::text[],
    array['openai', 'anthropicai', 'googledeepmind', 'xai', 'cursor_ai'],
    101
  ),
  (
    'a1aa0003-0003-4003-8003-000000000003',
    '🛰️ Radar・Discovery',
    '#14b8a6',
    array['just launched', 'new ai app', 'open source ai', 'ai tool launch'],
    array[]::text[],
    102
  )
on conflict (id) do update set
  name = excluded.name,
  color = excluded.color,
  keywords = excluded.keywords,
  accounts = excluded.accounts,
  sort_order = excluded.sort_order;

insert into public.posts (
  source,
  external_id,
  author_handle,
  author_name,
  verified,
  text,
  media,
  engagement,
  posted_at,
  category_ids,
  fetched_at,
  url
) values
(
  'threads',
  'seed:threads:claude-code-agent-loop',
  'anthropicai',
  'Anthropic',
  true,
  'Claude Code agents are becoming the default workflow for shipping small internal tools: inspect the repo, make the change, verify, then commit.',
  '[]'::jsonb,
  '{"play": 18400, "like": 932, "comment": 68, "save": 211, "share": 74}'::jsonb,
  now() - interval '2 hours',
  array['11111111-1111-4111-8111-111111111111'::uuid],
  now(),
  'https://www.threads.net/@anthropicai/post/seed-claude-code-agent-loop'
),
(
  'x',
  'seed:x:cursor-claude-code',
  'cursor_ai',
  'Cursor',
  true,
  'Cursor plus Claude Code is strongest when the AI owns one narrow diff and the human owns acceptance. Smaller work orders beat vague prompts.',
  '[]'::jsonb,
  '{"play": 9200, "like": 511, "comment": 42, "save": 128, "share": 35}'::jsonb,
  now() - interval '6 hours',
  array['11111111-1111-4111-8111-111111111111'::uuid],
  now(),
  'https://x.com/cursor_ai/status/1750000000001'
),
(
  'ig',
  'seed:ig:cline-short-demo',
  'cline_ai',
  'Cline',
  false,
  'A short demo shows Cline turning a bug report into a passing test and a patch. The creator angle: AI engineers need crisp review loops.',
  '[{"type":"image","url":"https://picsum.photos/seed/atlas-cline/1200/675"}]'::jsonb,
  '{"play": 55200, "like": 2810, "comment": 144, "save": 508, "share": 233}'::jsonb,
  now() - interval '18 hours',
  array['11111111-1111-4111-8111-111111111111'::uuid],
  now(),
  'https://www.instagram.com/p/SeedClineDemo/'
),
(
  'threads',
  'seed:threads:anthropic-release-note',
  'anthropicai',
  'Anthropic',
  true,
  'Anthropic developers are using Claude Code as a coordination layer: notes become tasks, tasks become diffs, diffs become verified commits.',
  '[]'::jsonb,
  '{"play": 12400, "like": 702, "comment": 51, "save": 166, "share": 49}'::jsonb,
  now() - interval '2 days',
  array['11111111-1111-4111-8111-111111111111'::uuid],
  now(),
  'https://www.threads.net/@anthropicai/post/seed-anthropic-release-note'
),
(
  'x',
  'seed:x:work-order-pattern',
  'ai_content_lab',
  'AI Content Lab',
  false,
  'The prompt pattern that keeps Claude Code reliable: one work order, one owner, one acceptance test, one commit. Boring is the point.',
  '[]'::jsonb,
  '{"play": 6800, "like": 388, "comment": 21, "save": 95, "share": 28}'::jsonb,
  now() - interval '5 days',
  array['11111111-1111-4111-8111-111111111111'::uuid],
  now(),
  'https://x.com/ai_content_lab/status/1750000000002'
),
(
  'ig',
  'seed:ig:ai-code-carousel',
  'buildwithai',
  'Build With AI',
  false,
  'Carousel idea: from prompt to production. Slide 1 asks what happens when your AI can read the whole repo; slide 10 asks viewers to save the workflow.',
  '[{"type":"image","url":"https://picsum.photos/seed/atlas-carousel/1200/675"}]'::jsonb,
  '{"play": 31400, "like": 1730, "comment": 82, "save": 402, "share": 119}'::jsonb,
  now() - interval '9 days',
  array['11111111-1111-4111-8111-111111111111'::uuid],
  now(),
  'https://www.instagram.com/p/SeedAiCodeCarousel/'
) on conflict (external_id) do update set
  source = excluded.source,
  author_handle = excluded.author_handle,
  author_name = excluded.author_name,
  verified = excluded.verified,
  text = excluded.text,
  media = excluded.media,
  engagement = excluded.engagement,
  posted_at = excluded.posted_at,
  category_ids = excluded.category_ids,
  fetched_at = excluded.fetched_at,
  url = excluded.url;
