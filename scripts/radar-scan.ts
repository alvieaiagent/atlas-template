// 🛰️ AI Radar 手動掃描（本機跑,你控制每次 Apify spend）
// Cron 係 OFF —— 想掃就行呢個。直接喺本機 call refreshInspirationFeed（radar 分類 · X only）
// 填返 scrape lane。
// 唔使 prod endpoint / CRON_SECRET —— 完全 self-contained。
//
// 用法（喺 atlas/ 行）：
//   npx tsx scripts/radar-scan.ts
// 需要 .env.local：SUPABASE_URL / SUPABASE_SERVICE_ROLE / APIFY_TOKEN。

import { readFileSync } from "node:fs";
import { join } from "node:path";

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
  if (!process.env.APIFY_TOKEN) {
    console.error("缺 APIFY_TOKEN（喺 atlas/.env.local）。");
    process.exit(1);
  }
  // 動態 import：apify.ts 內部用 getServerEnv，要 env 載完先 import。
  const { refreshInspirationFeed } = await import("../src/lib/scraping/apify");

  console.log("🛰️ 本機觸發 radar 掃描（radar 分類 · X only）…可能要 1-2 分鐘");
  const results = await refreshInspirationFeed(false, {
    categoryFilter: (category) => category.sortOrder >= 100,
    sources: ["x"],
  });

  let fetched = 0;
  for (const r of results) {
    const tag = r.skipped ? "skip" : r.error ? `err: ${r.error}` : `+${r.fetched}`;
    fetched += r.fetched ?? 0;
    console.log(`  ${r.categoryId} · ${r.source}: ${tag}`);
  }
  console.log(`\n✅ 掃完,新增 ${fetched} 條。`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
