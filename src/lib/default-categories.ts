import type { Category } from "@/lib/types";

export type DefaultCategory = Omit<Category, "createdAt">;

/**
 * Canonical default inspiration categories. Fixed UUIDs make seeding idempotent and
 * non-destructive — re-seeding upserts these rows by id and never touches user-created
 * categories (which carry their own generated ids). Keep in sync with supabase/seed.sql.
 */
export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Prompt Engineering",
    color: "#a855f7",
    keywords: ["prompt engineering", "prompt", "system prompt", "context engineering"],
    accounts: [],
    sortOrder: 1,
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    name: "AI Video",
    color: "#f97316",
    keywords: ["sora", "veo", "runway", "pika", "kling"],
    accounts: ["runwayml", "pika_labs"],
    sortOrder: 2,
  },
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "AI Code",
    color: "#38bdf8",
    keywords: ["claude code", "cursor", "cline", "lovable"],
    accounts: ["anthropicai", "cursor_ai"],
    sortOrder: 3,
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    name: "AI Image",
    color: "#ec4899",
    keywords: ["midjourney", "flux", "nano banana"],
    accounts: [],
    sortOrder: 4,
  },
  {
    id: "55555555-5555-4555-8555-555555555555",
    name: "AI Tools",
    color: "#22c55e",
    keywords: ["ai tool", "new ai", "ai app", "ai agent"],
    accounts: [],
    sortOrder: 5,
  },
  {
    id: "66666666-6666-4666-8666-666666666666",
    name: "Carousel Inspiration",
    color: "#eab308",
    keywords: ["carousel", "swipe", "infographic"],
    accounts: [],
    sortOrder: 6,
  },
  {
    id: "77777777-7777-4777-8777-777777777777",
    name: "IG Story 漏斗",
    color: "#ef4444",
    keywords: ["story", "funnel", "lead magnet"],
    accounts: [],
    sortOrder: 7,
  },
  // 🛰️ AI Radar — sortOrder >= 100 marks the auto-fed "情報雷達" lane (scraped, not
  // manual saves). The 2×/day cron (/api/cron/radar) scrapes ONLY these on X to keep
  // Apify cost down; they surface as tabs on /inspiration and feed scripts/radar.ts.
  {
    id: "a1aa0001-0001-4001-8001-000000000001",
    name: "🛰️ Radar・News",
    color: "#0ea5e9",
    keywords: [],
    accounts: [
      "rundownai",
      "mreflow",
      "_akhaliq",
      "testingcatalog",
      "fofrai",
      "producthunt",
      "officiallogank",
      "simonw",
    ],
    sortOrder: 100,
  },
  {
    id: "a1aa0002-0002-4002-8002-000000000002",
    name: "🛰️ Radar・Labs",
    color: "#6366f1",
    keywords: [],
    accounts: ["openai", "anthropicai", "googledeepmind", "xai", "cursor_ai"],
    sortOrder: 101,
  },
  {
    id: "a1aa0003-0003-4003-8003-000000000003",
    name: "🛰️ Radar・Discovery",
    color: "#14b8a6",
    keywords: ["just launched", "new ai app", "open source ai", "ai tool launch"],
    accounts: [],
    sortOrder: 102,
  },
];
