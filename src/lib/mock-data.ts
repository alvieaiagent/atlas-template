import type { Category, MarkedPost, Post } from "@/lib/types";

export const mockCategories: Category[] = [
  {
    id: "claude-code",
    name: "Claude Code",
    color: "#38bdf8",
    keywords: ["claude code", "anthropic", "cursor", "cline"],
    accounts: ["anthropicai", "cursor_ai"],
    sortOrder: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: "ai-video",
    name: "AI Video",
    color: "#f97316",
    keywords: ["sora", "veo", "runway", "pika", "kling"],
    accounts: ["runwayml", "pika_labs"],
    sortOrder: 2,
    createdAt: new Date().toISOString(),
  },
];

export const mockPosts: Post[] = [
  {
    id: "mock-1",
    source: "threads",
    externalId: "mock-threads-1",
    authorHandle: "anthropicai",
    authorName: "Anthropic",
    verified: true,
    text: "Claude Code workflows are moving from quick prompts into full software operating loops. The useful pattern is still simple: inspect, plan, edit, verify, then commit.",
    media: [],
    engagement: {
      play: 18400,
      like: 932,
      comment: 68,
      save: 211,
      share: 74,
    },
    postedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    categoryIds: ["claude-code"],
    fetchedAt: new Date().toISOString(),
    url: "https://www.threads.net/@anthropicai/post/mock-threads-1",
    purpose: "research",
    marked: false,
    used: false,
  },
  {
    id: "mock-2",
    source: "ig",
    externalId: "mock-ig-1",
    authorHandle: "runwayml",
    authorName: "Runway",
    verified: true,
    text: "A new video model demo shows consistent character motion across multiple shots. Useful for short-form creators who need reusable visual hooks.",
    media: [
      {
        type: "image",
        url: "https://picsum.photos/seed/atlas-runway/1200/675",
      },
    ],
    engagement: {
      play: 52400,
      like: 2810,
      comment: 144,
      save: 508,
      share: 233,
    },
    postedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    categoryIds: ["ai-video"],
    fetchedAt: new Date().toISOString(),
    url: "https://www.instagram.com/p/mock-ig-1/",
    purpose: "reel",
    marked: true,
    used: false,
  },
];

export const mockMarkedPosts: MarkedPost[] = mockPosts
  .filter((post) => post.marked)
  .map((post) => ({
    ...post,
    markedAt: new Date().toISOString(),
    status: "pending",
    notes: null,
  }));
