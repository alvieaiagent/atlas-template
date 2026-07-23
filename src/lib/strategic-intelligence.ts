import type { Post, Source } from "@/lib/types";

export const LEARNING_AREAS = [
  { slug: "ai-market-movement", label: "AI Market Movement" },
  { slug: "platform-strategy", label: "Platform Strategy" },
  { slug: "creator-economy", label: "Creator Economy" },
  { slug: "growth-case-studies", label: "Growth Case Studies" },
  { slug: "partnership-angles", label: "Partnership Angles" },
  { slug: "consumer-product-trends", label: "Consumer/Product Trends" },
] as const;

export type LearningAreaSlug = (typeof LEARNING_AREAS)[number]["slug"];
export type LearningAreaLabel = (typeof LEARNING_AREAS)[number]["label"];

export const WORTH_TAGS = [
  "Use for Career",
  "Use for Business",
  "Use for CityU",
  "Use for AI",
  "Use for Content Creation",
  "Use for Partnership",
  "Build POV",
  "Case Study",
  "Market Signal",
  "Watch Later",
  "Ignore / Noise",
] as const;

export type WorthTag = (typeof WORTH_TAGS)[number];

export const RECOMMENDED_ACTIONS = ["Save to Knowledge Bank", ...WORTH_TAGS] as const;
export type RecommendedAction = (typeof RECOMMENDED_ACTIONS)[number];

export const CRAWL_BUDGET_MODES = [
  { value: "Conservative", recommended: true, cadence: "Friday 9:00am HKT · P0 watchlist only", scope: "Max 3 YouTube videos/channel, 6 IG posts/creator, 10 X/Threads results/lane." },
  { value: "Balanced", recommended: false, cadence: "Tuesday + Friday 9:00am HKT", scope: "P0 plus selected P1 watchlist with slightly higher source limits." },
  { value: "Manual Only", recommended: false, cadence: "No automatic crawl", scope: "Force refresh only. Safest while Alvie is not posting publicly yet." },
  { value: "Aggressive", recommended: false, cadence: "Daily · not recommended", scope: "Only consider when Atlas is actively supporting public publishing or monetization." },
] as const;

export type CrawlBudgetMode = (typeof CRAWL_BUDGET_MODES)[number]["value"];
export const WATCHLIST_PRIORITIES = ["P0 Weekly", "P1 Monthly", "Manual Only"] as const;
export type WatchlistPriority = (typeof WATCHLIST_PRIORITIES)[number];

export type JaniceSummary = {
  executiveSummary: string;
  keyPoints: string[];
  highlights: string[];
  lowlights: string[];
  flags: string[];
  implicationForAlvie: string;
  recommendedAction: RecommendedAction;
  sourcesUsed: string[];
};

export type DailySummary = JaniceSummary & { id: string; dateHkt: string; learningArea: LearningAreaLabel; isFallback: boolean };
export type WatchlistItem = { name: string; source: Source | "website" | "other"; urlOrHandle: string; priority: WatchlistPriority; learningArea: LearningAreaLabel; notes: string; lastRefreshed: string; nextSuggestedRefresh: string; persisted: boolean };
export type StrategicTopicPreset = { learningArea: LearningAreaLabel; keywords: string[]; accounts: string[]; notes: string };

export function getLearningArea(slug: string): (typeof LEARNING_AREAS)[number] | undefined { return LEARNING_AREAS.find((area) => area.slug === slug); }

export const STRATEGIC_TOPIC_PRESETS: StrategicTopicPreset[] = [
  { learningArea: "AI Market Movement", keywords: ["AI agents", "Gemini", "Claude", "OpenAI", "model launches", "AI workflow", "automation"], accounts: ["openai", "anthropicai", "GoogleDeepMind", "sama"], notes: "Track AI shifts that affect Alvie's career positioning and AI business opportunities." },
  { learningArea: "Platform Strategy", keywords: ["creator monetization", "platform algorithm", "YouTube strategy", "Threads growth", "Instagram updates", "search distribution"], accounts: ["YouTubeCreators", "mosseri", "instagram", "threads"], notes: "Watch distribution changes and platform incentives before building content or partnership plays." },
  { learningArea: "Creator Economy", keywords: ["faceless AI content", "creator business", "short-form hooks", "content systems", "audience growth", "newsletter monetization"], accounts: ["ColinandSamir", "paddy_galloway", "creatorhooks"], notes: "Use for content creation systems and passive-income experiments." },
  { learningArea: "Growth Case Studies", keywords: ["growth strategy", "go-to-market", "case study", "viral loop", "retention", "pricing", "funnel"], accounts: ["lennysan", "andrewchen", "reforge"], notes: "Use for Big Tech interviews, business theses, and partnership POVs." },
  { learningArea: "Partnership Angles", keywords: ["strategic partnerships", "business development", "ecosystem", "channel partnership", "co-marketing", "platform partners"], accounts: ["stripe", "shopify", "notionhq", "canva"], notes: "Use for Business Director / BD / Partnerships language and deal-angle thinking." },
  { learningArea: "Consumer/Product Trends", keywords: ["consumer apps", "social commerce", "AI companion", "Gen Z behavior", "community", "subscription product"], accounts: ["a16zconsumer", "ProductHunt", "gregisenberg"], notes: "Track product patterns useful for Alvie's business ideas and Pokémon subscription platform thinking." },
];

export function inferLearningAreaForPost(post: Post): LearningAreaLabel {
  const text = `${post.text} ${post.authorHandle} ${post.authorName}`.toLowerCase();
  const score = (words: string[]) => words.reduce((sum, word) => sum + (text.includes(word.toLowerCase()) ? 1 : 0), 0);
  const ranked = STRATEGIC_TOPIC_PRESETS.map((preset) => ({ preset, points: score([...preset.keywords, ...preset.accounts]) })).sort((a, b) => b.points - a.points);
  if (ranked[0]?.points > 0) return ranked[0].preset.learningArea;
  if (post.source === "youtube" || post.purpose === "research") return "Growth Case Studies";
  if (post.source === "ig" || post.purpose === "reel" || post.purpose === "carousel") return "Creator Economy";
  if (post.purpose === "business") return "Partnership Angles";
  return "Consumer/Product Trends";
}

export const FALLBACK_DAILY_SUMMARIES: DailySummary[] = LEARNING_AREAS.map((area, index) => ({
  id: `fallback-${area.slug}`,
  dateHkt: "Sample · not live data",
  learningArea: area.label,
  isFallback: true,
  executiveSummary: "No generated daily summary has been saved yet. This card is a V3 structure preview only, so do not treat it as market intelligence.",
  keyPoints: ["Atlas needs real crawled links, notes, or selected watchlist items before Janice can brief this lane.", "Use Quick Capture or Force Refresh first, then save the useful outputs into Knowledge Bank."],
  highlights: ["The lane is ready for Janice-style executive summaries once data exists."],
  lowlights: ["Fallback content has no source evidence and should not drive decisions."],
  flags: ["Missing live Supabase daily_summaries table or generated entries."],
  implicationForAlvie: "Use this lane to turn reading into career, business, CityU, AI, content, or partnership POV only after sources are captured.",
  recommendedAction: index === 0 ? "Use for AI" : "Watch Later",
  sourcesUsed: ["Fallback sample only"],
}));

export const FALLBACK_WATCHLIST: WatchlistItem[] = [
  { name: "P0 AI platform leaders", source: "x", urlOrHandle: "@example-ai-platform-list", priority: "P0 Weekly", learningArea: "AI Market Movement", notes: "Typed fallback: replace with real high-signal X accounts or lists.", lastRefreshed: "Not connected", nextSuggestedRefresh: "Friday 9:00am HKT", persisted: false },
  { name: "Priority YouTube learning channels", source: "youtube", urlOrHandle: "Paste specific channel/video URLs", priority: "Manual Only", learningArea: "Growth Case Studies", notes: "YouTube is supported first through Quick Capture; avoid broad channel crawling until needed.", lastRefreshed: "Manual capture only", nextSuggestedRefresh: "When Alvie finds a useful video", persisted: false },
  { name: "Instagram creator references", source: "ig", urlOrHandle: "@manual-watchlist", priority: "P0 Weekly", learningArea: "Creator Economy", notes: "Conservative scope: latest 6 posts/reels per P0 creator.", lastRefreshed: "Not connected", nextSuggestedRefresh: "Friday 9:00am HKT", persisted: false },
];

// TODO Atlas V2 schema recommendation when DB migration is approved:
// daily_summaries(id, date_hkt, learning_area, executive_summary, key_points jsonb,
// highlights jsonb, lowlights jsonb, flags jsonb, implication_for_alvie,
// recommended_action, source_post_ids jsonb, sources_used jsonb, created_at, updated_at).
// Add nullable post metadata: learning_area, worth_tags, janice_summary,
// janice_verdict, saved_to_knowledge_bank, archived_at/hidden_from_active, used_at.
