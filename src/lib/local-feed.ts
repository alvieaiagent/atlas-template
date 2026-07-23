import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Database } from "@/lib/database.types";

type PostRow = Database["public"]["Tables"]["posts"]["Row"];
type PostInsert = Database["public"]["Tables"]["posts"]["Insert"];

// Local mock-mode feed store: crawled Signals/Radar posts land here when
// Supabase is absent, so Force Refresh works on the Mini exactly like prod.
const storePath = join(process.cwd(), ".hermes", "local-feed-posts.json");

export async function getLocalFeedRows(): Promise<PostRow[]> {
  try {
    return JSON.parse(await readFile(storePath, "utf8")) as PostRow[];
  } catch {
    return [];
  }
}

async function writeStore(rows: PostRow[]): Promise<void> {
  await mkdir(join(process.cwd(), ".hermes"), { recursive: true });
  await writeFile(storePath, `${JSON.stringify(rows, null, 2)}\n`);
}

/** Upsert crawled rows by external_id, filling Row defaults the crawlers omit. */
export async function upsertLocalFeedRows(inserts: PostInsert[]): Promise<number> {
  if (!inserts.length) {
    return 0;
  }
  const rows = await getLocalFeedRows();
  const byExternal = new Map(rows.map((row) => [row.external_id, row]));
  const now = new Date().toISOString();

  for (const insert of inserts) {
    const existing = byExternal.get(insert.external_id);
    byExternal.set(insert.external_id, {
      id: existing?.id ?? `local-${insert.external_id}`,
      source: insert.source,
      external_id: insert.external_id,
      author_handle: insert.author_handle,
      author_name: insert.author_name,
      verified: insert.verified ?? existing?.verified ?? false,
      text: insert.text,
      media: insert.media ?? existing?.media ?? [],
      engagement: insert.engagement ?? existing?.engagement ?? {},
      posted_at: insert.posted_at ?? existing?.posted_at ?? now,
      category_ids: insert.category_ids ?? existing?.category_ids ?? [],
      fetched_at: now,
      url: insert.url ?? existing?.url ?? null,
      added_via: insert.added_via ?? existing?.added_via ?? "scrape",
      purpose: insert.purpose ?? existing?.purpose ?? "inbox",
      used: existing?.used ?? false,
      learning_area: insert.learning_area ?? existing?.learning_area ?? null,
      worth_tags: insert.worth_tags ?? existing?.worth_tags ?? [],
      janice_summary: existing?.janice_summary ?? null,
      janice_verdict: existing?.janice_verdict ?? null,
      saved_to_knowledge_bank: existing?.saved_to_knowledge_bank ?? false,
      archived_at: existing?.archived_at ?? null,
      hidden_from_active: existing?.hidden_from_active ?? false,
      used_at: existing?.used_at ?? null,
    });
  }

  // Newest first, keep the store bounded so mock mode never grows unbounded.
  const merged = [...byExternal.values()]
    .sort((a, b) => (b.posted_at > a.posted_at ? 1 : -1))
    .slice(0, 500);
  await writeStore(merged);
  return inserts.length;
}
