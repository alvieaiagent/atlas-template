// web = 任何網站連結（GitHub / blog / 短連結），note = 純文字段落，xiaohongshu = 小紅書
// （xhslink 分享連結，免費抓 embedded note JSON）。全部同 youtube/facebook 一樣係
// Library-only（唔入 inspiration feed），免費擷取、唔使 Apify。
export type Source =
  | "x"
  | "threads"
  | "ig"
  | "youtube"
  | "facebook"
  | "web"
  | "note"
  | "xiaohongshu";

export type AddedVia = "scrape" | "manual";

export type Purpose =
  | "reel"
  | "carousel"
  | "cheatsheet"
  | "swipe"
  | "research"
  | "business"
  | "inbox";

export const PURPOSES: { value: Purpose; label: string }[] = [
  { value: "reel", label: "Reel 腳本" },
  { value: "carousel", label: "Carousel" },
  { value: "cheatsheet", label: "一頁攻略圖" },
  { value: "swipe", label: "Swipe 拆解" },
  { value: "research", label: "學習研究" },
  { value: "business", label: "商業/Offer" },
  { value: "inbox", label: "待發掘" },
];

export function isPurpose(value: unknown): value is Purpose {
  return PURPOSES.some((p) => p.value === value);
}

export type Competitor = {
  source: Source;
  handle: string;
  name: string | null;
  addedAt: string;
};

export type LibraryPreview = {
  source: Source;
  url: string;
  authorName: string;
  authorHandle: string;
  text: string;
  thumbnailUrl: string | null;
  views: number;
};

export type ResolveLinkState = {
  ran: boolean;
  ok: boolean;
  message: string | null;
  persisted: boolean;
  preview: LibraryPreview | null;
};

export type ScriptsState = {
  ran: boolean;
  ok: boolean;
  caption: string | null;
  transcript: string | null;
  error: string | null;
};

export type GenerateState = {
  ran: boolean;
  ok: boolean;
  purpose: Purpose | null;
  content: string | null;
  error: string | null;
};

export type TimeFilter = "4h" | "24h" | "48h" | "7d" | "all";

export type ViewMode = "grid" | "list";

export type MarkedStatus = "pending" | "shot" | "rejected";

export type DestinationState = "ok" | "failed" | "skipped";

export type MarkState = {
  ran: boolean;
  supabase: DestinationState;
  error: string | null;
};

export type MediaItem = {
  type: "image" | "video";
  url: string;
};

export type Engagement = {
  play: number;
  like: number;
  comment: number;
  save: number;
  share: number;
};

export type Category = {
  id: string;
  name: string;
  color: string;
  keywords: string[];
  accounts: string[];
  sortOrder: number;
  createdAt: string;
};

export type Post = {
  id: string;
  source: Source;
  externalId: string;
  authorHandle: string;
  authorName: string;
  verified: boolean;
  text: string;
  media: MediaItem[];
  engagement: Engagement;
  postedAt: string;
  categoryIds: string[];
  fetchedAt: string;
  url: string | null;
  purpose: Purpose;
  marked: boolean;
  used: boolean;
};

export type MarkedPost = Post & {
  markedAt: string;
  status: MarkedStatus;
  notes: string | null;
};

export type SourceSetting = {
  source: Source;
  label: string;
  enabled: boolean;
};

export const SOURCES: SourceSetting[] = [
  { source: "x", label: "X", enabled: true },
  { source: "threads", label: "Threads", enabled: true },
  { source: "ig", label: "IG Reels", enabled: true },
];

export const TIME_FILTERS: { value: TimeFilter; label: string }[] = [
  { value: "4h", label: "4h" },
  { value: "24h", label: "24h" },
  { value: "48h", label: "48h" },
  { value: "7d", label: "7d" },
  { value: "all", label: "All" },
];

export const DEFAULT_ENGAGEMENT: Engagement = {
  play: 0,
  like: 0,
  comment: 0,
  save: 0,
  share: 0,
};
