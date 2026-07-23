import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getServerEnv } from "@/lib/env";
import { geminiGenerateText } from "@/lib/integrations/gemini";
import type { Language } from "@/lib/language";
import { getLocalFeedRows } from "@/lib/local-feed";
import { getLocalLibraryPosts } from "@/lib/local-library";
import {
  LEARNING_AREAS,
  RECOMMENDED_ACTIONS,
  type DailySummary,
  type LearningAreaLabel,
  type RecommendedAction,
} from "@/lib/strategic-intelligence";

// Real Daily Learnings for local mock mode: one Gemini pass per HKT day per
// language over everything Alvie has captured (Knowledge Bank + crawled feed),
// grouped into the 6 learning areas. Cached to disk so the LLM runs once a day.
const storePath = join(process.cwd(), ".hermes", "daily-learnings.json");

type Store = Record<string, DailySummary[]>; // key: `${dateHkt}:${language}`

function todayHkt(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Hong_Kong" }).format(new Date());
}

async function readStore(): Promise<Store> {
  try {
    return JSON.parse(await readFile(storePath, "utf8")) as Store;
  } catch {
    return {};
  }
}

const PROMPT = `You are Janice, Alvie's chief-of-staff analyst. Alvie is an ex-Meta Client Partner in Hong Kong pursuing: a Big Tech offer, a Pokemon TCG investment platform, CityU social-media lecturing, and a faceless AI passive-income line.

Below are posts Alvie captured recently. Produce ONE daily briefing per learning area, ONLY for areas where the posts contain relevant signal. Areas: ${LEARNING_AREAS.map((a) => a.label).join("; ")}.

Return ONLY a JSON array:
[{"learningArea":"<exact area label>","executiveSummary":"<2-3 sentences>","keyPoints":["..."],"highlights":["..."],"lowlights":["..."],"flags":["..."],"implicationForAlvie":"<specific to her goals>","recommendedAction":"<one of: ${RECOMMENDED_ACTIONS.join(" | ")}>","sourcesUsed":["@handle or url", ...]}]

Rules: only use facts from the posts; empty arrays are fine for highlights/lowlights/flags; skip areas with no signal entirely; be blunt, no padding.
{LANGUAGE_RULE}

Posts:
{POSTS}`;

const LANGUAGE_RULE: Record<Language, string> = {
  en: "Write all values in English.",
  yue: "所有 value 用香港廣東話口語寫（learningArea 同 recommendedAction 保持英文原值，JSON keys 英文）。",
};

function coerceSummaries(raw: string, dateHkt: string): DailySummary[] {
  const jsonText = raw.replace(/^```(?:json)?/m, "").replace(/```\s*$/m, "").trim();
  const labels = new Set<string>(LEARNING_AREAS.map((a) => a.label));
  try {
    const items = JSON.parse(jsonText) as Record<string, unknown>[];
    if (!Array.isArray(items)) return [];
    const strings = (v: unknown): string[] =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
    return items
      .filter((item) => typeof item.learningArea === "string" && labels.has(item.learningArea))
      .map((item, index) => ({
        id: `local-${dateHkt}-${index}`,
        dateHkt,
        learningArea: item.learningArea as LearningAreaLabel,
        isFallback: false,
        executiveSummary: typeof item.executiveSummary === "string" ? item.executiveSummary : "",
        keyPoints: strings(item.keyPoints),
        highlights: strings(item.highlights),
        lowlights: strings(item.lowlights),
        flags: strings(item.flags),
        implicationForAlvie: typeof item.implicationForAlvie === "string" ? item.implicationForAlvie : "",
        recommendedAction: (RECOMMENDED_ACTIONS as readonly string[]).includes(item.recommendedAction as string)
          ? (item.recommendedAction as RecommendedAction)
          : "Save to Knowledge Bank",
      sourcesUsed: strings(item.sourcesUsed),
      }))
      .filter((summary) => summary.executiveSummary);
  } catch {
    return [];
  }
}

/**
 * Today's real Daily Learnings from captured posts. Returns [] when there is
 * nothing to summarize or no LLM key — the page then shows its honest empty /
 * sample state instead of fake intelligence.
 */
export async function getLocalDailyLearnings(language: Language): Promise<DailySummary[]> {
  const dateHkt = todayHkt();
  const cacheKey = `${dateHkt}:${language}`;
  const store = await readStore();
  if (store[cacheKey]) {
    return store[cacheKey];
  }

  const { GEMINI_API_KEY } = getServerEnv();
  if (!GEMINI_API_KEY) {
    return [];
  }

  const [library, feed] = await Promise.all([getLocalLibraryPosts(), getLocalFeedRows()]);
  const feedTexts = feed.map((row) => ({
    handle: row.author_handle,
    url: row.url,
    text: row.text,
  }));
  const libraryTexts = library.map((post) => ({
    handle: post.authorHandle,
    url: post.url,
    text: post.text,
  }));
  const posts = [...libraryTexts, ...feedTexts]
    .filter((post) => post.text.trim())
    .slice(0, 60);
  if (!posts.length) {
    return [];
  }

  const payload = posts
    .map((post) => `@${post.handle} (${post.url ?? "no-url"}): ${post.text.replace(/\s+/g, " ").slice(0, 400)}`)
    .join("\n---\n");
  const response = await geminiGenerateText(
    GEMINI_API_KEY,
    [{ text: PROMPT.replace("{LANGUAGE_RULE}", LANGUAGE_RULE[language]).replace("{POSTS}", payload) }],
    { temperature: 0.2, maxOutputTokens: 8000 },
  );
  if (!response.ok) {
    console.log("[daily-learnings] gemini failed:", response.error);
    return [];
  }

  const summaries = coerceSummaries(response.text, dateHkt);
  if (!summaries.length) {
    console.log("[daily-learnings] parse produced 0 summaries; raw head:", response.text.slice(0, 300));
  }
  if (summaries.length) {
    try {
      const fresh = await readStore();
      fresh[cacheKey] = summaries;
      await mkdir(join(process.cwd(), ".hermes"), { recursive: true });
      await writeFile(storePath, `${JSON.stringify(fresh, null, 2)}\n`);
    } catch {
      // Read-only FS — serve uncached.
    }
  }
  return summaries;
}
