// 🔄 救返過期 IG 縮圖（一個 Apify run）
// IG/fbcdn CDN URL 過期 → 舊卡變黑、backfill 救唔到（download 403）。呢個 script 攞返
// 仲係 IG-CDN（未 snapshot）嘅 IG post，用 **一個** Apify run（directUrls array）重新
// scrape 攞 fresh displayUrl → snapshot 落 Supabase Storage（永久）→ update DB。
//
// ⚠️ 會用 Apify（一個 run，平過逐條跑）。用法（喺 atlas/ 行）：
//   npx tsx scripts/rescrape-images.ts
// 需要 .env.local：SUPABASE_URL / SUPABASE_SERVICE_ROLE / APIFY_TOKEN。

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { ApifyClient } from "apify-client";
import { parseMedia } from "../src/lib/mappers";
import type { MediaItem } from "../src/lib/types";
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

function shortcode(url: string | null): string | null {
  if (!url) return null;
  return url.match(/\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/)?.[1] ?? null;
}

async function main() {
  loadEnvLocal();
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE, APIFY_TOKEN } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE || !APIFY_TOKEN) {
    console.error("缺 env：需要 SUPABASE_URL + SUPABASE_SERVICE_ROLE + APIFY_TOKEN。");
    process.exit(1);
  }
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  await ensureThumbnailBucket(sb);

  const { data, error } = await sb
    .from("posts")
    .select("id, external_id, url, media")
    .eq("source", "ig")
    .eq("added_via", "manual")
    .limit(1000);
  if (error) {
    console.error("讀 posts 失敗：", error.message);
    process.exit(1);
  }

  type Target = { id: string; ext: string | null; url: string; sc: string; media: MediaItem[] };
  const targets: Target[] = [];
  for (const p of (data ?? []) as Array<{ id: string; external_id: string | null; url: string | null; media: unknown }>) {
    const media = parseMedia((p.media ?? []) as never);
    const first = media.find((m) => m.type === "image");
    if (!first) continue;
    if (first.url.includes("/storage/v1/object/public/")) continue; // already permanent
    const sc = shortcode(p.url);
    if (!p.url || !sc) continue;
    targets.push({ id: p.id, ext: p.external_id, url: p.url, sc, media });
  }

  console.log(`🔄 要救嘅 IG post：${targets.length} 條`);
  if (targets.length === 0) return;

  const client = new ApifyClient({ token: APIFY_TOKEN });

  // --run <runId> 重用已 scrape 好嘅 run（唔再花 Apify），否則開新 run。
  const reuseRunId = process.argv.includes("--run")
    ? process.argv[process.argv.indexOf("--run") + 1]
    : null;

  let datasetId: string | undefined;
  if (reuseRunId) {
    console.log(`重用 Apify run ${reuseRunId}（唔再 scrape）…`);
    const run = await client.run(reuseRunId).get();
    datasetId = run?.defaultDatasetId;
  } else {
    console.log("一個 Apify run scrape 緊…（可能要幾分鐘）");
    const run = await client.actor("apify/instagram-scraper").call({
      directUrls: targets.map((t) => t.url),
      resultsType: "posts",
      resultsLimit: targets.length,
      addParentData: false,
    });
    datasetId = run.defaultDatasetId;
  }
  if (!datasetId) {
    console.error("Apify run 冇 dataset。");
    process.exit(1);
  }
  const { items } = await client.dataset(datasetId).listItems({ limit: targets.length * 2 });

  // shortcode → fresh image url
  const freshByShort = new Map<string, string>();
  for (const it of items as Array<Record<string, unknown>>) {
    const sc =
      (typeof it.shortCode === "string" && it.shortCode) ||
      shortcode(typeof it.url === "string" ? it.url : null);
    const img =
      (typeof it.displayUrl === "string" && it.displayUrl) ||
      (Array.isArray(it.images) && typeof it.images[0] === "string" && it.images[0]) ||
      (typeof it.imageUrl === "string" && it.imageUrl) ||
      null;
    if (sc && img) freshByShort.set(sc, img);
  }
  console.log(`Apify 返 ${items.length} 個 item，揾到 fresh 圖 ${freshByShort.size} 個`);

  let saved = 0,
    noFresh = 0,
    failed = 0;
  for (const t of targets) {
    const fresh = freshByShort.get(t.sc);
    if (!fresh) {
      noFresh += 1;
      continue;
    }
    const key = String(t.ext ?? t.id).replace(/[^a-z0-9]/gi, "_").slice(0, 80);
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
    if (saved % 10 === 0) console.log(`  …已救 ${saved}`);
  }

  console.log(`\n✅ 完成：救返 ${saved}｜scrape 唔返 ${noFresh}｜snapshot/update 失敗 ${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
