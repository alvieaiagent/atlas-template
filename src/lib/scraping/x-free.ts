import type { Json } from "@/lib/database.types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// 🆓 Free X (Twitter) ingestion for the radar — no Apify, no API key, no paid plan.
// Uses Twitter's public embed "syndication" timeline endpoint (the same one that
// powers embedded profile timelines on websites). Returns ~20 recent tweets per
// public account as JSON inside the page's __NEXT_DATA__ blob.

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

type Rec = Record<string, unknown>;
function isRec(v: unknown): v is Rec {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function str(o: unknown, key: string): string {
  const v = isRec(o) ? o[key] : undefined;
  return typeof v === "string" ? v : "";
}
function num(o: unknown, key: string): number {
  const v = isRec(o) ? o[key] : undefined;
  return typeof v === "number" ? v : 0;
}

/** Find the largest `entries` array anywhere in the parsed JSON (robust to layout changes). */
function findEntries(root: unknown): unknown[] {
  let best: unknown[] = [];
  const walk = (x: unknown): void => {
    if (Array.isArray(x)) {
      x.forEach(walk);
      return;
    }
    if (isRec(x)) {
      const e = x["entries"];
      if (Array.isArray(e) && e.length > best.length) best = e;
      Object.values(x).forEach(walk);
    }
  };
  walk(root);
  return best;
}

export type XInsert = {
  source: "x";
  external_id: string;
  author_handle: string;
  author_name: string;
  verified: boolean;
  text: string;
  media: Json;
  engagement: Json;
  posted_at: string;
  url: string;
  category_ids: string[];
};

function tweetToInsert(tweet: Rec, categoryIds: string[]): XInsert | null {
  const idStr = str(tweet, "id_str") || (num(tweet, "id") ? String(num(tweet, "id")) : "");
  const text = str(tweet, "full_text") || str(tweet, "text");
  if (!idStr || !text.trim()) return null;

  const user = tweet["user"];
  const handle = str(user, "screen_name");
  const name = str(user, "name") || handle;
  const verified =
    isRec(user) && (user["verified"] === true || user["is_blue_verified"] === true);

  const createdAt = str(tweet, "created_at");
  const parsed = createdAt ? new Date(createdAt) : new Date();
  const postedAt = Number.isNaN(parsed.getTime())
    ? new Date().toISOString()
    : parsed.toISOString();

  const permalink = str(tweet, "permalink");
  const url = permalink.startsWith("http")
    ? permalink
    : `https://x.com/${handle}/status/${idStr}`;

  const entities = tweet["entities"];
  const mediaRaw = isRec(entities) ? entities["media"] : undefined;
  const media = Array.isArray(mediaRaw)
    ? mediaRaw
        .map((m) => ({
          type: str(m, "type") === "video" ? "video" : "image",
          url: str(m, "media_url_https") || str(m, "media_url"),
        }))
        .filter((m) => m.url)
    : [];

  const engagement = {
    play: 0,
    like: num(tweet, "favorite_count"),
    comment: num(tweet, "reply_count"),
    save: 0,
    share: num(tweet, "retweet_count") + num(tweet, "quote_count"),
  };

  return {
    source: "x",
    external_id: `x:${idStr}`,
    author_handle: handle,
    author_name: name,
    verified,
    text,
    media: media as unknown as Json,
    engagement: engagement as unknown as Json,
    posted_at: postedAt,
    url,
    category_ids: categoryIds,
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Fetch recent tweets for one public handle via the free syndication endpoint. */
export async function fetchProfileTweets(
  handle: string,
  categoryIds: string[],
): Promise<XInsert[]> {
  const clean = handle.replace(/^@/, "").trim();
  if (!clean) return [];
  const url = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${encodeURIComponent(clean)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
  });
  if (!res.ok) throw new Error(`syndication HTTP ${res.status}`);
  const html = await res.text();
  return parseProfileHtml(html, categoryIds);
}

/** Extract tweets from a syndication timeline HTML page (the __NEXT_DATA__ blob). */
export function parseProfileHtml(html: string, categoryIds: string[]): XInsert[] {
  const match = html.match(
    /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
  );
  if (!match) return [];

  let data: unknown;
  try {
    data = JSON.parse(match[1]);
  } catch {
    return [];
  }

  const entries = findEntries(data);
  const inserts: XInsert[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const content = isRec(entry) ? entry["content"] : undefined;
    const tweet = isRec(content) ? content["tweet"] : undefined;
    if (!isRec(tweet)) continue;
    const insert = tweetToInsert(tweet, categoryIds);
    if (insert && !seen.has(insert.external_id)) {
      seen.add(insert.external_id);
      inserts.push(insert);
    }
  }
  return inserts;
}

export type RadarFreeResult = {
  handle: string;
  fetched: number;
  error?: string;
};

/**
 * Refresh the radar lane for FREE: for every account across radar categories
 * (sortOrder >= 100), pull recent tweets via syndication and upsert into posts.
 * Keyword-only radar categories are skipped (syndication is profile-based).
 */
export async function refreshRadarFromSyndication(): Promise<RadarFreeResult[]> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return [{ handle: "-", fetched: 0, error: "Supabase service role missing" }];
  }

  const { data: cats, error } = await supabase
    .from("categories")
    .select("id, accounts, sort_order")
    .gte("sort_order", 100);
  if (error) throw new Error(error.message);

  // account handle -> which radar category ids it belongs to
  const accountMap = new Map<string, string[]>();
  for (const cat of cats ?? []) {
    for (const raw of cat.accounts ?? []) {
      const handle = String(raw).replace(/^@/, "").toLowerCase();
      if (!handle) continue;
      accountMap.set(handle, [...(accountMap.get(handle) ?? []), cat.id]);
    }
  }

  // The syndication endpoint rate-limits bursts, so fetch the highest-value
  // accounts FIRST and cap per run — if we trip 429 mid-way the flagships are
  // already in. Remaining accounts get picked up on the next press (upsert).
  const PRIORITY = [
    "openai",
    "anthropicai",
    "googledeepmind",
    "rundownai",
    "testingcatalog",
    "mreflow",
    "xai",
    "_akhaliq",
  ];
  const MAX_PER_RUN = 5;
  const rank = (h: string) => {
    const i = PRIORITY.indexOf(h);
    return i < 0 ? PRIORITY.length + 1 : i;
  };

  const results: RadarFreeResult[] = [];
  const accounts = [...accountMap.entries()]
    .sort((a, b) => rank(a[0]) - rank(b[0]))
    .slice(0, MAX_PER_RUN);
  for (let i = 0; i < accounts.length; i++) {
    const [handle, categoryIds] = accounts[i];
    try {
      const inserts = await fetchProfileTweets(handle, categoryIds);
      if (inserts.length > 0) {
        const { error: upErr } = await supabase
          .from("posts")
          .upsert(inserts, { onConflict: "external_id" });
        if (upErr) throw new Error(upErr.message);
      }
      results.push({ handle, fetched: inserts.length });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "fetch failed";
      results.push({ handle, fetched: 0, error: msg });
      // Hit the per-IP rate limit — stop now. Hammering the rest only deepens the
      // ban; the upsert already saved whatever we got, and the next press resumes.
      if (msg.includes("429")) {
        for (let j = i + 1; j < accounts.length; j++) {
          results.push({ handle: accounts[j][0], fetched: 0, error: "skipped (rate-limited)" });
        }
        break;
      }
    }
    // Space out requests so a normal run stays under the rate limit.
    if (i < accounts.length - 1) await sleep(400);
  }
  return results;
}
