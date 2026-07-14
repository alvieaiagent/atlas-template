// 🖼️ Atlas 縮圖 backfill → permanent Storage
// IG/fbcdn CDN URL 過幾日就過期 → 卡變黑。呢個 script 喺你部 Mac（住宅 IP，仲攞到圖）
// 一次過 download 仲未死嘅縮圖 → upload 去 Supabase Storage `thumbnails` bucket → update DB
// 用永久 public URL。已過期嘅（403）救唔返,會 count 出嚟。
// 之後新 capture 由 actions.ts 自動 snapshot,唔使再行呢個。
//
// 用法（喺 atlas/ 行）：
//   npx tsx scripts/snapshot-images.ts
// 需要 .env.local：SUPABASE_URL / SUPABASE_SERVICE_ROLE。

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Json } from "../src/lib/database.types";
import { parseMedia } from "../src/lib/mappers";
import {
  ensureThumbnailBucket,
  snapshotImage,
} from "../src/lib/scraping/snapshot";

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
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    console.error("缺 env：需要 SUPABASE_URL + SUPABASE_SERVICE_ROLE（喺 atlas/.env.local）。");
    process.exit(1);
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("🖼️ 縮圖 backfill → Storage\n確保 bucket…");
  await ensureThumbnailBucket(supabase);

  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, external_id, media")
    .eq("added_via", "manual")
    .order("posted_at", { ascending: false })
    .limit(1000);
  if (error) {
    console.error("讀 posts 失敗：", error.message);
    process.exit(1);
  }

  let saved = 0,
    expired = 0,
    skipped = 0,
    noimg = 0;
  for (const post of (posts ?? []) as Array<{ id: string; external_id: string | null; media: Json }>) {
    const media = parseMedia(post.media ?? []);
    const firstImage = media.find((m) => m.type === "image");
    if (!firstImage) {
      noimg += 1;
      continue;
    }
    if (firstImage.url.includes("/storage/v1/object/public/")) {
      skipped += 1; // already snapshotted
      continue;
    }
    const key = String(post.external_id ?? post.id)
      .replace(/[^a-z0-9]/gi, "_")
      .slice(0, 80);
    const permanent = await snapshotImage(supabase, firstImage.url, key);
    if (!permanent) {
      expired += 1; // URL dead (403) — unrecoverable
      continue;
    }
    const newMedia = media.map((m) =>
      m === firstImage ? { ...m, url: permanent } : m,
    );
    const { error: upErr } = await supabase
      .from("posts")
      .update({ media: newMedia as unknown as never })
      .eq("id", post.id);
    if (upErr) {
      console.error(`  update 失敗 ${post.id}: ${upErr.message}`);
      continue;
    }
    saved += 1;
    if (saved % 10 === 0) console.log(`  …已存 ${saved}`);
  }

  console.log(
    `\n✅ 完成：救返 ${saved}｜已過期救唔到 ${expired}｜已 snapshot 過 skip ${skipped}｜無圖 ${noimg}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
