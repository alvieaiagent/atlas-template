// 🔄 救返過期 Facebook 縮圖（免費,唔使 Apify directUrls）
// FB 嘅 fbcdn 縮圖 URL 一樣會過期 → 舊卡變黑。呢個 script 逐條 re-resolve 仲係 fbcdn
// （未 snapshot）嘅 FB post,攞 fresh 圖 → snapshot 落 Storage → update DB。
// FB 用免費 oEmbed / plugin scrape（resolveSinglePost facebook 內置 fallback）。
//
// 用法（喺 atlas/ 行）：
//   npx tsx scripts/rescue-fb-images.ts          # 全部
//   npx tsx scripts/rescue-fb-images.ts 2        # 淨係頭 2 條（test）
// 需要 .env.local：SUPABASE_URL / SUPABASE_SERVICE_ROLE（+ 可選 APIFY_TOKEN）。

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { parseMedia } from "../src/lib/mappers";
import { resolveSinglePost } from "../src/lib/scraping/apify";
import { ensureThumbnailBucket, snapshotImage } from "../src/lib/scraping/snapshot";

function loadEnvLocal(): void {
  try {
    const text = readFileSync(join(process.cwd(), ".env.local"), "utf8");
    for (const raw of text.split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // rely on shell env
  }
}

async function main() {
  loadEnvLocal();
  const limit = Number(process.argv[2]) > 0 ? Number(process.argv[2]) : Infinity;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    console.error("缺 env：需要 SUPABASE_URL + SUPABASE_SERVICE_ROLE。");
    process.exit(1);
  }
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  await ensureThumbnailBucket(sb);

  const { data } = await sb
    .from("posts")
    .select("id, external_id, url, media")
    .eq("source", "facebook")
    .eq("added_via", "manual")
    .limit(500);

  const targets = ((data ?? []) as Array<{ id: string; external_id: string | null; url: string | null; media: unknown }>)
    .map((p) => ({ ...p, media: parseMedia((p.media ?? []) as never) }))
    .filter((p) => {
      const first = p.media.find((m) => m.type === "image");
      return p.url && first && !first.url.includes("/storage/v1/object/public/");
    })
    .slice(0, limit);

  console.log(`🔄 要救嘅 FB post：${targets.length} 條`);

  let saved = 0,
    noFresh = 0,
    failed = 0;
  for (const t of targets) {
    let fresh: string | null = null;
    try {
      const normalized = await resolveSinglePost("facebook", t.url as string);
      fresh = parseMedia((normalized?.media ?? []) as never).find((m) => m.type === "image")?.url ?? null;
    } catch {
      fresh = null;
    }
    if (!fresh || fresh.includes("/storage/v1/")) {
      noFresh += 1;
      console.log(`  ✗ 攞唔到 fresh 圖：${t.url}`);
      continue;
    }
    const key = String(t.external_id ?? t.id).replace(/[^a-z0-9]/gi, "_").slice(0, 80);
    const permanent = await snapshotImage(sb, fresh, key);
    if (!permanent) {
      failed += 1;
      continue;
    }
    const imgIdx = t.media.findIndex((m) => m.type === "image");
    const newMedia = t.media.map((m, i) => (i === imgIdx ? { ...m, url: permanent } : m));
    const { error: upErr } = await sb
      .from("posts")
      .update({ media: newMedia as unknown as never })
      .eq("id", t.id);
    if (upErr) {
      console.error(`  update 失敗 ${t.id}: ${upErr.message}`);
      failed += 1;
      continue;
    }
    saved += 1;
    console.log(`  ✅ 救返：${t.url?.slice(0, 60)}`);
  }

  console.log(`\n✅ 完成：救返 ${saved}｜攞唔到 fresh ${noFresh}｜失敗 ${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
