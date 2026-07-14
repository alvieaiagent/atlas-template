import type { Json } from "@/lib/database.types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getServerEnv } from "@/lib/env";
import { geminiGenerateText } from "@/lib/integrations/gemini";

// 🆓 Free, datacenter-friendly radar sources — all work from Vercel (unlike the
// Twitter syndication endpoint, which 429s datacenter IPs). Focused on new GitHub
// projects, new AI tools, and lab updates (OpenAI / Claude / HF) — NOT
// climate/policy/"AI bubble" op-eds.

// Radar lane categories (sortOrder >= 100). Keep in sync with default-categories.ts.
const RADAR_NEWS = "a1aa0001-0001-4001-8001-000000000001";
const RADAR_LABS = "a1aa0002-0002-4002-8002-000000000002";
const RADAR_DISCOVERY = "a1aa0003-0003-4003-8003-000000000003";

// AI-topic gate (for mixed-source feeds: Simon Willison / Product Hunt / Show HN).
const AI_RE =
  /\b(ai|gpt|llm|llms|agent|agents|model|models|claude|openai|anthropic|gemini|llama|mistral|qwen|deepseek|diffusion|rag|prompt|copilot|chatbot|neural|genai|multimodal|inference|fine-?tune|transformer|hugging\s?face|langchain|mcp)\b/i;
// Drop the noise (climate / datacenter economics / policy / bubble).
// Exported so getRadarPosts can also hide legacy noise rows already in the DB.
export const NOISE_RE =
  /(climate|warming|carbon|emission|cornfield|water\s?usage|energy grid|power grid|\bbubble\b|regulat|lawsuit|copyright|layoff|congress|senate|privacy|surveillance|deepfake|\belection\b)/i;

export type FeedInsert = {
  source: "web";
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

type Rec = Record<string, unknown>;
function isRec(v: unknown): v is Rec {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function str(o: unknown, k: string): string {
  const v = isRec(o) ? o[k] : undefined;
  return typeof v === "string" ? v : "";
}
function num(o: unknown, k: string): number {
  const v = isRec(o) ? o[k] : undefined;
  return typeof v === "number" ? v : 0;
}
const nowIso = () => new Date().toISOString();
function eng(like: number, comment: number): Json {
  return { play: 0, like, comment, save: 0, share: 0 } as unknown as Json;
}
function isoDate(input: string): string {
  if (!input) return nowIso();
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? nowIso() : d.toISOString();
}

function stripTags(html: string): string {
  return html
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function pickTag(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? m[1].trim() : "";
}

// ── GitHub: recent, popular AI repos (new projects) ──────────────────────────
async function fetchGitHub(): Promise<FeedInsert[]> {
  const since = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10);
  const q = encodeURIComponent(
    `llm OR "ai agent" OR "llm agent" OR "ai tool" created:>${since}`,
  );
  const res = await fetch(
    `https://api.github.com/search/repositories?q=${q}&sort=stars&order=desc&per_page=20`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "atlas-radar",
      },
    },
  );
  if (!res.ok) throw new Error(`GitHub HTTP ${res.status}`);
  const data: unknown = await res.json();
  const items =
    isRec(data) && Array.isArray(data["items"]) ? (data["items"] as unknown[]) : [];

  const out: FeedInsert[] = [];
  for (const it of items) {
    const name = str(it, "full_name");
    const url = str(it, "html_url");
    const id = num(it, "id");
    if (!name || !url || !id) continue;
    const desc = str(it, "description");
    const stars = num(it, "stargazers_count");
    const text = `${name}${desc ? ` — ${desc}` : ""} ⭐${stars}`.slice(0, 400);
    if (NOISE_RE.test(text)) continue; // query is already AI-scoped
    out.push({
      source: "web",
      external_id: `gh:${id}`,
      author_handle: "github",
      author_name: "GitHub",
      verified: false,
      text,
      media: [] as unknown as Json,
      engagement: eng(stars, 0),
      posted_at: isoDate(str(it, "pushed_at") || str(it, "created_at")),
      url,
      category_ids: [RADAR_DISCOVERY],
    });
  }
  return out;
}

// ── Generic RSS (item) + Atom (entry) feed reader ────────────────────────────
type ParsedItem = { title: string; url: string; summary: string; date: string; id: string };
function parseFeed(xml: string): ParsedItem[] {
  const isAtom = /<entry[\s>]/.test(xml);
  const chunks = isAtom
    ? xml.split(/<entry[\s>]/).slice(1)
    : xml.split(/<item[\s>]/).slice(1);

  const out: ParsedItem[] = [];
  for (const raw of chunks) {
    const block = raw.split(isAtom ? /<\/entry>/ : /<\/item>/)[0];
    const title = stripTags(pickTag(block, "title"));
    let url = "";
    if (isAtom) {
      const lm =
        block.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"/i) ??
        block.match(/<link[^>]*href="([^"]+)"/i);
      url = lm ? lm[1].replace(/&amp;/g, "&") : "";
    } else {
      url = stripTags(pickTag(block, "link"));
    }
    if (!title || !url) continue;
    const summary = stripTags(
      pickTag(block, isAtom ? "content" : "description") || pickTag(block, "summary"),
    );
    const date = pickTag(block, isAtom ? "published" : "pubDate") || pickTag(block, "updated");
    const id = pickTag(block, isAtom ? "id" : "guid") || url;
    out.push({ title, url, summary, date, id });
  }
  return out;
}

async function fetchRssSource(cfg: {
  url: string;
  handle: string;
  name: string;
  categoryId: string;
  requireAI: boolean;
}): Promise<FeedInsert[]> {
  const res = await fetch(cfg.url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept:
        "application/rss+xml,application/atom+xml,application/xml,text/xml,*/*",
    },
  });
  if (!res.ok) throw new Error(`${cfg.name} HTTP ${res.status}`);
  const xml = await res.text();

  const out: FeedInsert[] = [];
  for (const it of parseFeed(xml).slice(0, 15)) {
    const hay = `${it.title} ${it.summary}`;
    if (cfg.requireAI && !AI_RE.test(hay)) continue;
    if (NOISE_RE.test(hay)) continue;
    out.push({
      source: "web",
      external_id: `${cfg.handle}:${it.id}`.slice(0, 300),
      author_handle: cfg.handle,
      author_name: cfg.name,
      verified: false,
      text: (it.summary ? `${it.title} — ${it.summary}` : it.title).slice(0, 400),
      media: [] as unknown as Json,
      engagement: eng(0, 0),
      posted_at: isoDate(it.date),
      url: it.url,
      category_ids: [cfg.categoryId],
    });
  }
  return out;
}

// ── Product Hunt (Atom) — new AI product launches ────────────────────────────
async function fetchProductHunt(): Promise<FeedInsert[]> {
  const items = await fetchRssSource({
    url: "https://www.producthunt.com/feed",
    handle: "producthunt",
    name: "Product Hunt",
    categoryId: RADAR_DISCOVERY,
    requireAI: true,
  });
  // Trim PH's trailing "Discussion | Link" boilerplate from the tagline.
  return items.map((it) => ({
    ...it,
    text: it.text.split(/\s+Discussion\s*\|/)[0].trim().slice(0, 400),
  }));
}

// ── Hacker News — real "Show HN" launches only (no op-eds) ────────────────────
async function fetchHackerNews(): Promise<FeedInsert[]> {
  const res = await fetch(
    "https://hn.algolia.com/api/v1/search_by_date?tags=show_hn&hitsPerPage=50",
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) throw new Error(`HN HTTP ${res.status}`);
  const data: unknown = await res.json();
  const hits =
    isRec(data) && Array.isArray(data["hits"]) ? (data["hits"] as unknown[]) : [];

  const out: FeedInsert[] = [];
  for (const hit of hits) {
    const title = str(hit, "title");
    const url = str(hit, "url");
    const id = str(hit, "objectID");
    if (!title || !url || !id) continue;
    if (!AI_RE.test(title) || NOISE_RE.test(title)) continue; // Show HN + AI only
    const created = num(hit, "created_at_i");
    out.push({
      source: "web",
      external_id: `hn:${id}`,
      author_handle: "hackernews",
      author_name: "Show HN",
      verified: false,
      text: title.replace(/^Show HN:\s*/i, ""),
      media: [] as unknown as Json,
      engagement: eng(num(hit, "points"), num(hit, "num_comments")),
      posted_at: created ? new Date(created * 1000).toISOString() : nowIso(),
      url,
      category_ids: [RADAR_NEWS],
    });
  }
  return out;
}

export type FeedResult = { source: string; fetched: number; error?: string };

// Gemini pass: give each item a one-line Cantonese explainer + a "worth posting"
// score (0-100) for a HK AI content creator with a mainstream audience. The
// result is embedded in `text` as `⭐{score}｜{中文}` — no schema/UI change needed,
// and /radar sorts by that score + only shows items that carry the ⭐ marker
// (which also hides legacy un-curated English rows).
async function curate(items: FeedInsert[]): Promise<FeedInsert[]> {
  const mark = (it: FeedInsert, score: number, zh: string): FeedInsert => ({
    ...it,
    text: `⭐${Math.max(0, Math.min(100, Math.round(score)))}｜${(zh || it.text).trim()}`.slice(0, 400),
  });

  const key = getServerEnv().GEMINI_API_KEY;
  if (!key || items.length === 0) return items.map((it) => mark(it, 50, it.text));

  const list = items
    .map((it, i) => `${i}. [${it.author_name}] ${it.text}`)
    .join("\n")
    .slice(0, 14000);
  const prompt = `你係一個 AI 情報官，服務對象係香港 AI 內容創作者，觀眾係想用 AI 嘅香港大眾 / 一人公司 / 打工仔。以下每條係最新 AI 工具 / 項目 / 大廠更新。

幫每一條做兩樣：
1) zh：一句地道香港廣東話（≤28字），講明「係咩 + 做乜 + 對邊個有用」。唔好淨係翻譯個名，要講到重點。
2) score：0-100，鋪成 Threads 有幾值得。大眾化 / 實用 / 有話題性 / 同 Claude·OpenAI 大廠有關 = 高分；太 niche、純 dev infra、細眾、無亮點 = 低分。

只輸出 JSON array，格式 [{"i":0,"zh":"…","score":85}]，唔好任何其他字。

${list}`;

  const res = await geminiGenerateText(key, [{ text: prompt }], {
    temperature: 0.3,
    maxOutputTokens: 8192,
    thinkingConfig: { thinkingBudget: 0 },
  });
  if (!res.ok) return items.map((it) => mark(it, 50, it.text));

  let parsed: unknown;
  try {
    const cleaned = res.text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const m = cleaned.match(/\[[\s\S]*\]/);
    parsed = JSON.parse(m ? m[0] : cleaned);
  } catch {
    return items.map((it) => mark(it, 50, it.text));
  }

  const byIndex = new Map<number, { zh: string; score: number }>();
  if (Array.isArray(parsed)) {
    for (const r of parsed) {
      if (isRec(r) && typeof r["i"] === "number") {
        byIndex.set(r["i"] as number, { zh: str(r, "zh"), score: num(r, "score") });
      }
    }
  }
  return items.map((it, i) => {
    const meta = byIndex.get(i);
    return mark(it, meta?.score ?? 50, meta?.zh || it.text);
  });
}

/**
 * Refresh the radar lane for FREE from tool/project/lab-focused feeds. Runs all
 * sources in parallel (fits the serverless timeout) and upserts into posts
 * (source='web', added_via defaults to 'scrape'); /radar reads them back.
 */
export async function refreshRadarFromFeeds(): Promise<FeedResult[]> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return [{ source: "-", fetched: 0, error: "Supabase service role missing" }];
  }

  const sources: { name: string; fn: () => Promise<FeedInsert[]> }[] = [
    { name: "github", fn: fetchGitHub },
    { name: "producthunt", fn: fetchProductHunt },
    {
      name: "openai",
      fn: () =>
        fetchRssSource({
          url: "https://openai.com/news/rss.xml",
          handle: "openai",
          name: "OpenAI",
          categoryId: RADAR_LABS,
          requireAI: false,
        }),
    },
    {
      name: "huggingface",
      fn: () =>
        fetchRssSource({
          url: "https://huggingface.co/blog/feed.xml",
          handle: "huggingface",
          name: "Hugging Face",
          categoryId: RADAR_LABS,
          requireAI: false,
        }),
    },
    {
      name: "simonwillison",
      fn: () =>
        fetchRssSource({
          url: "https://simonwillison.net/atom/everything/",
          handle: "simonwillison",
          name: "Simon Willison",
          categoryId: RADAR_NEWS,
          requireAI: true,
        }),
    },
    { name: "hackernews", fn: fetchHackerNews },
  ];

  const settled = await Promise.allSettled(sources.map((s) => s.fn()));
  const results: FeedResult[] = [];
  const all: FeedInsert[] = [];
  for (let i = 0; i < sources.length; i++) {
    const r = settled[i];
    if (r.status === "rejected") {
      results.push({
        source: sources[i].name,
        fetched: 0,
        error: r.reason instanceof Error ? r.reason.message : "failed",
      });
      continue;
    }
    all.push(...r.value);
    results.push({ source: sources[i].name, fetched: r.value.length });
  }

  // One Gemini pass over everything → Cantonese explainer + worth-posting score.
  const curated = await curate(all);
  if (curated.length > 0) {
    const { error } = await supabase
      .from("posts")
      .upsert(curated, { onConflict: "external_id" });
    if (error) results.push({ source: "upsert", fetched: 0, error: error.message });
  }
  return results;
}
