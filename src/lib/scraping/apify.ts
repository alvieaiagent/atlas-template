import { ApifyClient } from "apify-client";
import type { Json } from "@/lib/database.types";
import { getServerEnv } from "@/lib/env";
import { getLocalCategories } from "@/lib/local-categories";
import { upsertLocalFeedRows } from "@/lib/local-feed";
import { mapCategory, parseMedia } from "@/lib/mappers";
import { warmThumbnailCache } from "@/lib/thumbnail-cache";
import { buildSinglePostInput } from "@/lib/link-source";
import { derivePostUrl } from "@/lib/post-url";
import { snapshotInsertImage } from "@/lib/scraping/snapshot";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Category, Engagement, MediaItem, Source } from "@/lib/types";
import type { Database } from "@/lib/database.types";

export const actorBySource: Record<Source, string> = {
  // Search-capable actors for the Inspiration feed. The previous X actor rejects
  // API runs on Apify Free plans, and the previous Threads actor was a single
  // post scraper that requires startUrls, so feed refreshes could run but save 0.
  x: "khadinakbar/x-twitter-search-scraper",
  threads: "igview-owner/threads-search-scraper",
  ig: "apify/instagram-hashtag-scraper",
  // YouTube resolves via oEmbed (no Apify actor); placeholder keeps the map total.
  youtube: "youtube-oembed",
  // Facebook uses Apify first, then Graph oEmbed fallback when actor/proxy fails.
  facebook: "kingscraper/facebook-post-scraper",
  // web (free fetch) + note (raw text) + xiaohongshu (free embedded-JSON scrape) never
  // touch Apify; placeholders keep the map total.
  web: "web-fetch",
  note: "note",
  xiaohongshu: "xhs-fetch",
};

// Single-post resolution needs different actors from feed search: the search
// actors above ignore buildSinglePostInput's URL-based schemas (e.g. the IG
// hashtag scraper silently returns nothing for `directUrls`), which broke
// paste-link capture and thumbnail rescue. Sources not listed here fall back
// to the search actor.
const singlePostActorBySource: Partial<Record<Source, string>> = {
  ig: "apify/instagram-scraper",
  threads: "logical_scrapers/threads-post-scraper",
};

export type RefreshResult = {
  source: Source;
  categoryId: string;
  fetched: number;
  skipped: boolean;
  error?: string;
};

type UnknownRecord = Record<string, unknown>;
export type NormalizedPostInsert = Database["public"]["Tables"]["posts"]["Insert"];

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: UnknownRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return null;
}

function readNestedRecord(record: UnknownRecord, keys: string[]): UnknownRecord {
  for (const key of keys) {
    const value = record[key];
    if (isRecord(value)) {
      return value;
    }
  }

  return {};
}

function readNumber(record: UnknownRecord, keys: string[]): number {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number") {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number(value.replaceAll(",", ""));
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return 0;
}

function readAuthor(record: UnknownRecord): { handle: string; name: string; verified: boolean } {
  const authorRecord = readNestedRecord(record, ["author", "user", "owner"]);
  const handle =
    readString(record, [
      "authorHandle",
      "authorUsername",
      "username",
      "ownerUsername",
      "userName",
      "handle",
      "screenName",
    ]) ??
    readString(authorRecord, ["username", "handle", "screenName", "userName"]) ??
    "unknown";
  const name =
    readString(record, ["authorName", "authorFullName", "fullName", "ownerFullName", "name"]) ??
    readString(authorRecord, ["name", "fullName", "displayName"]) ??
    handle;
  const verified =
    record.verified === true ||
    authorRecord.verified === true ||
    authorRecord.isVerified === true;

  return { handle: handle.replace(/^@/, ""), name, verified };
}

function readMedia(record: UnknownRecord): MediaItem[] {
  const media: MediaItem[] = [];
  const mediaValue = record.media;

  if (Array.isArray(mediaValue)) {
    mediaValue.forEach((item) => {
      if (!isRecord(item)) {
        return;
      }

      const url = readString(item, ["url", "src", "videoUrl", "imageUrl"]);
      const typeValue = readString(item, ["type"]);
      const type: MediaItem["type"] = typeValue === "video" ? "video" : "image";
      if (url) {
        media.push({ type, url });
      }
    });
  }

  const imageUrl = readString(record, ["imageUrl", "displayUrl", "thumbnailUrl"]);
  if (imageUrl) {
    media.push({ type: "image", url: imageUrl });
  }

  const videoUrl = readString(record, ["videoUrl", "video_url"]);
  if (videoUrl) {
    media.push({ type: "video", url: videoUrl });
  }

  return media;
}

function readEngagement(record: UnknownRecord): Engagement {
  return {
    play: readNumber(record, [
      "playCount",
      "viewCount",
      "videoViewCount",
      "videoPlayCount",
      "viewsCount",
      "views",
    ]),
    like: readNumber(record, ["likeCount", "likesCount", "likes", "favoriteCount", "like_count"]),
    comment: readNumber(record, [
      "commentCount",
      "commentsCount",
      "replyCount",
      "directReplyCount",
      "comments",
      "comment_count",
    ]),
    save: readNumber(record, ["saveCount", "bookmarkCount", "bookmarks"]),
    share: readNumber(record, ["shareCount", "reshareCount", "retweetCount", "shares", "share_count"]),
  };
}

export function buildQuery(category: Category): string {
  const keywordQuery = category.keywords.map((keyword) => `"${keyword}"`).join(" OR ");
  const accountQuery = category.accounts
    .map((account) => `from:${account.replace(/^@/, "")}`)
    .join(" OR ");

  return [keywordQuery, accountQuery].filter(Boolean).join(" OR ");
}

export function buildActorInput(source: Source, query: string, cursor: string | null): UnknownRecord {
  const maxItems = 10;
  switch (source) {
    case "x":
      return stripNullish({
        query,
        searchQuery: query,
        queries: [query],
        maxItems,
        maxResults: maxItems,
        limit: maxItems,
        sort: "Latest",
        searchMode: "Latest",
        cursor,
      });
    case "threads":
      return stripNullish({
        searchQuery: query.replaceAll("\"", ""),
        sort: "recent",
        maxPages: 1,
        maxItems,
        cursor,
      });
    case "ig":
      return {
        hashtags: hashtagsFromQuery(query),
        resultsType: "posts",
        resultsLimit: maxItems,
        onlyPostsNewerThan: "7 days",
      };
    case "youtube":
      // YouTube isn't part of the scraped feed (Library-only); never called.
      return {};
    case "facebook":
      // Facebook isn't part of the scraped feed (Library-only); never called.
      return {};
    case "web":
    case "note":
    case "xiaohongshu":
      // Library-only manual captures; never part of the scraped feed.
      return {};
  }
}

function stripNullish(record: UnknownRecord): UnknownRecord {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== null && value !== undefined),
  );
}

function hashtagsFromQuery(query: string): string[] {
  const tags = query
    .split(/\s+OR\s+/i)
    .map((term) => term.replaceAll("\"", "").trim())
    .map((term) => term.replace(/[^a-z0-9_]/gi, ""))
    .filter((term) => term.length >= 2)
    .slice(0, 3);

  return tags.length ? tags : ["ai"];
}

function stableHash(value: string): string {
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }

  return (hash >>> 0).toString(36);
}

function readText(source: Source, item: UnknownRecord): string {
  const captionRecord = readNestedRecord(item, ["caption"]);
  const directText =
    source === "x"
      ? readString(item, ["fullText", "text", "caption", "description", "full_text"])
      : source === "threads"
        ? readString(item, [
            "text",
            "captionText",
            "caption_text",
            "caption",
            "text_content",
            "description",
            "title",
          ]) ?? readString(captionRecord, ["text", "content"])
        : readString(item, ["caption", "captionText", "text", "description"]);

  if (directText) {
    return directText;
  }

  const latestComment = readNestedRecord(item, ["latestComments", "latestComment"]);
  return readString(latestComment, ["text", "comment"]) ?? "";
}

function readExternalId(source: Source, item: UnknownRecord, text: string, postedAt: string): string {
  const id =
    source === "x"
      ? readString(item, ["tweetId", "tweet_id", "id", "postId", "url"])
      : source === "threads"
        ? readString(item, ["postId", "thread_id", "id", "url", "thread_url", "code"])
        : readString(item, ["shortCode", "id", "postId", "url"]);

  if (id) {
    return id;
  }

  return `generated:${stableHash(`${source}:${postedAt}:${text}`)}`;
}

function readPostedAt(item: UnknownRecord): string {
  const raw =
    readString(item, ["createdAt", "created_at", "timestamp", "takenAt", "date"]) ??
    new Date().toISOString();
  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }

  return date.toISOString();
}

function mediaItems(value: unknown, type: MediaItem["type"]): MediaItem[] {
  if (typeof value === "string" && value.trim()) {
    return [{ type, url: value }];
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    const url =
      typeof entry === "string"
        ? entry
        : isRecord(entry)
          ? readString(entry, [
              "url",
              "src",
              "image",
              "imageUrl",
              "image_url",
              "video",
              "videoUrl",
              "video_url",
              "thumbnail",
              "thumbnailUrl",
              "downloadUrl",
              "hdUrl",
              "sdUrl",
            ])
          : null;
    return url ? [{ type, url }] : [];
  });
}

function facebookHandleFromUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    const first = url.pathname.split("/").filter(Boolean)[0];
    if (!first || ["share", "story.php", "photo.php", "watch", "reel"].includes(first)) {
      return null;
    }
    return first;
  } catch {
    return null;
  }
}

function isUsableFacebookPostUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    if (
      host !== "facebook.com" &&
      !host.endsWith(".facebook.com") &&
      host !== "fb.watch" &&
      host !== "fb.me"
    ) {
      return false;
    }

    const pathname = url.pathname.toLowerCase();
    return (
      pathname.startsWith("/share/") ||
      pathname.startsWith("/story.php") ||
      pathname.startsWith("/photo") ||
      pathname.startsWith("/watch") ||
      pathname.startsWith("/reel/") ||
      pathname.includes("/posts/") ||
      pathname.includes("/videos/")
    );
  } catch {
    return false;
  }
}

function cleanFacebookInputUrl(raw: string): string {
  try {
    const url = new URL(raw);
    const keep = new URLSearchParams();
    ["story_fbid", "id", "fbid", "v"].forEach((key) => {
      const value = url.searchParams.get(key);
      if (value) {
        keep.set(key, value);
      }
    });
    url.search = keep.toString();
    return url.toString();
  } catch {
    return raw;
  }
}

// logical_scrapers/threads-post-scraper nests the post under `thread` with snake_case
// keys (text / username / like_count / reply_count / user_verified / images / videos /
// url). Flatten it to the keys the generic readers expect.
function threadsRecord(thread: UnknownRecord): UnknownRecord {
  const toMedia = (value: unknown, type: MediaItem["type"]): MediaItem[] =>
    Array.isArray(value)
      ? value.flatMap((entry) => {
          const url =
            typeof entry === "string"
              ? entry
              : isRecord(entry)
                ? readString(entry, ["url", "src", "image_url", "video_url", "downloadUrl"])
                : null;
          return url ? [{ type, url }] : [];
        })
      : [];

  const publishedOn = thread.published_on;
  const timestamp =
    typeof publishedOn === "number"
      ? new Date(publishedOn * 1000).toISOString()
      : undefined;

  return {
    ...thread,
    text:
      readString(thread, ["text", "caption", "text_content"]) ??
      readString(readNestedRecord(thread, ["caption"]), ["text", "content"]),
    verified: thread.user_verified === true,
    likeCount: thread.like_count,
    replyCount: thread.reply_count,
    timestamp,
    media: [...toMedia(thread.videos, "video"), ...toMedia(thread.images, "image")],
  };
}

// Facebook actors vary a lot. Normalize the common flat/nested shapes into the
// generic keys used by readText/readAuthor/readMedia/readEngagement.
function facebookRecord(item: UnknownRecord): UnknownRecord {
  const nested = readNestedRecord(item, ["post", "data", "result", "facebook_post"]);
  const record = Object.keys(nested).length ? { ...item, ...nested } : item;
  const author = readNestedRecord(record, ["author", "page", "profile", "owner", "user"]);
  const pageName =
    readString(record, ["pageName", "page_name", "profileName", "profile_name", "author_name"]) ??
    readString(author, ["name", "pageName", "title"]);
  const authorUrl =
    readString(record, ["pageUrl", "page_url", "profileUrl", "profile_url", "author_url"]) ??
    readString(author, ["url", "link"]);
  const handle =
    readString(record, ["authorHandle", "pageUsername", "username", "profileUsername", "handle"]) ??
    (authorUrl ? facebookHandleFromUrl(authorUrl) : null) ??
    (pageName ? pageName.replace(/\s+/g, "") : null);
  const timestamp =
    readString(record, ["timestamp", "created_time", "createdAt", "publishTime"]) ??
    readString(record, ["date", "time", "postedAt", "posted_at"]);
  const media = [
    ...mediaItems(record.media, "image"),
    ...mediaItems(record.images, "image"),
    ...mediaItems(record.photos, "image"),
    ...mediaItems(record.image, "image"),
    ...mediaItems(record.imageUrl, "image"),
    ...mediaItems(record.thumbnail, "image"),
    ...mediaItems(record.thumbnailUrl, "image"),
    ...mediaItems(record.videos, "video"),
    ...mediaItems(record.video, "video"),
    ...mediaItems(record.videoUrl, "video"),
    ...mediaItems(record.video_url, "video"),
    ...mediaItems(record.hdVideoUrl, "video"),
    ...mediaItems(record.sdVideoUrl, "video"),
  ];

  return {
    ...record,
    authorName: pageName,
    authorHandle: handle,
    username: handle,
    timestamp,
    text: readString(record, ["text", "message", "caption", "description", "postText", "post_text"]),
    postId: readString(record, ["postId", "post_id", "id", "facebookId", "facebook_id"]),
    permalink: readString(record, ["permalink", "url", "postUrl", "post_url", "shareUrl", "share_url"]),
    likeCount: readNumber(record, ["likes", "like_count", "likesCount", "reactionCount", "reactions_count"]),
    commentCount: readNumber(record, ["comments", "comment_count", "commentsCount", "commentCount"]),
    shareCount: readNumber(record, ["shares", "share_count", "sharesCount", "shareCount"]),
    viewCount: readNumber(record, ["views", "view_count", "playCount", "videoViewCount"]),
    media,
  };
}

export function normalizeApifyItem(
  source: Source,
  categoryId: string,
  item: unknown,
): NormalizedPostInsert | null {
  if (!isRecord(item)) {
    return null;
  }

  // Threads and some Facebook actors need source-specific flattening first.
  const record =
    source === "threads" && isRecord(item.thread)
      ? threadsRecord(item.thread)
      : source === "threads" && isRecord(item.post)
        ? threadsRecord(item.post)
      : source === "threads" && isRecord(item.data)
        ? threadsRecord(item.data)
      : source === "facebook"
        ? facebookRecord(item)
      : item;

  const text = readText(source, record);

  if (!text.trim()) {
    return null;
  }

  const author = readAuthor(record);
  const postedAt = readPostedAt(record);
  const externalId = readExternalId(source, record, text, postedAt);
  const explicitUrl = readString(record, [
    "url",
    "postUrl",
    "permalink",
    "link",
    "twitterUrl",
    "threadUrl",
    "thread_url",
    "shareUrl",
  ]);
  const url =
    explicitUrl && /^https?:\/\//.test(explicitUrl)
      ? explicitUrl
      : derivePostUrl(source, author.handle, externalId);

  return {
    source,
    external_id: `${source}:${externalId}`,
    author_handle: author.handle,
    author_name: author.name,
    verified: author.verified,
    text,
    media: readMedia(record) as Json,
    engagement: readEngagement(record) as unknown as Json,
    posted_at: new Date(postedAt).toISOString(),
    category_ids: [categoryId],
    fetched_at: new Date().toISOString(),
    url,
  };
}

export function normalizeApifyItems(
  source: Source,
  categoryId: string,
  items: unknown[],
): NormalizedPostInsert[] {
  return items.flatMap((item) => {
    const normalized = normalizeApifyItem(source, categoryId, item);

    if (!normalized) {
      const keys = isRecord(item) ? Object.keys(item).slice(0, 12).join(",") : typeof item;
      const nestedKeys =
        isRecord(item) && isRecord(item.data)
          ? Object.keys(item.data).slice(0, 12).join(",")
          : isRecord(item) && isRecord(item.post)
            ? Object.keys(item.post).slice(0, 12).join(",")
            : isRecord(item) && isRecord(item.thread)
              ? Object.keys(item.thread).slice(0, 12).join(",")
              : "";
      console.warn(
        `Skipped malformed ${source} item during Apify normalization. keys=${keys} nested=${nestedKeys}`,
      );
      return [];
    }

    return [normalized];
  });
}

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") {
      return u.pathname.slice(1) || null;
    }
    if (u.pathname.startsWith("/shorts/")) {
      return u.pathname.split("/")[2] || null;
    }
    return u.searchParams.get("v");
  } catch {
    return null;
  }
}

function youTubeHandle(authorUrl: string | undefined, authorName: string): string {
  if (authorUrl) {
    try {
      const parts = new URL(authorUrl).pathname.replace(/^\/+/, "").split("/");
      const seg = parts[0]?.startsWith("@") ? parts[0] : parts[1] ?? parts[0];
      if (seg) {
        return seg.replace(/^@/, "");
      }
    } catch {
      // fall through to the name
    }
  }
  return authorName.replace(/\s+/g, "");
}

// YouTube resolves via the free oEmbed endpoint (no Apify) — enough for a learning
// bookmark card: title + channel + thumbnail. Defaults 用途 to research (學習).
async function resolveYouTube(url: string): Promise<NormalizedPostInsert | null> {
  const res = await fetch(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
  );
  if (!res.ok) {
    return null;
  }

  const data = (await res.json()) as {
    title?: string;
    author_name?: string;
    author_url?: string;
    thumbnail_url?: string;
  };

  const title = data.title?.trim();
  if (!title) {
    return null;
  }

  const id = extractYouTubeId(url);
  const cleanUrl = id ? `https://www.youtube.com/watch?v=${id}` : url;
  const media = data.thumbnail_url
    ? [{ type: "image", url: data.thumbnail_url }]
    : [];

  return {
    source: "youtube",
    external_id: `youtube:${id ?? stableHash(url)}`,
    author_handle: youTubeHandle(data.author_url, data.author_name ?? "youtube"),
    author_name: data.author_name ?? "YouTube",
    verified: false,
    text: title,
    media: media as unknown as Json,
    engagement: {
      play: 0,
      like: 0,
      comment: 0,
      save: 0,
      share: 0,
    } as unknown as Json,
    posted_at: new Date().toISOString(),
    category_ids: [],
    fetched_at: new Date().toISOString(),
    url: cleanUrl,
    purpose: "research",
    added_via: "manual",
  };
}

const ZERO_ENGAGEMENT = {
  play: 0,
  like: 0,
  comment: 0,
  save: 0,
  share: 0,
} as unknown as Json;

/** Read a <meta property|name="key" content="…"> value (either attribute order). */
function metaContent(html: string, key: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${key}["']`, "i"),
  ];
  for (const re of patterns) {
    const match = html.match(re);
    if (match && match[1].trim()) {
      return decodeHtmlAttribute(match[1].trim());
    }
  }
  return null;
}

function pageTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? stripHtml(match[1]).trim() || null : null;
}

/** Prefer <article>/<main> body so the excerpt skips nav/footer boilerplate. */
function extractMainHtml(html: string): string {
  for (const tag of ["article", "main"]) {
    const match = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
    if (match && match[1].length > 200) {
      return match[1];
    }
  }
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return body ? body[1] : html;
}

// Generic web link (GitHub / blog / 短連結) — free fetch, no Apify. Lightweight: grab
// title + og:description + a clean body excerpt so Triage / ✨生成 has real material to
// chew on later. Resolves short links via redirect (dub.sh / xhslink → final URL).
async function resolveWebArticle(url: string): Promise<NormalizedPostInsert | null> {
  let res: Response;
  try {
    res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      },
    });
  } catch {
    return null;
  }
  if (!res.ok) {
    return null;
  }

  const finalUrl = res.url || url;
  const host = (() => {
    try {
      return new URL(finalUrl).hostname.replace(/^www\./, "");
    } catch {
      return "web";
    }
  })();

  const contentType = res.headers.get("content-type") ?? "";
  const isHtml =
    contentType === "" ||
    contentType.includes("html") ||
    contentType.includes("xml");
  const html = isHtml ? await res.text() : "";

  const fallbackTitle = (() => {
    try {
      const u = new URL(finalUrl);
      return `${host}${u.pathname}`.replace(/\/$/, "") || host;
    } catch {
      return host;
    }
  })();

  const title = metaContent(html, "og:title") ?? pageTitle(html) ?? fallbackTitle;
  const description = metaContent(html, "og:description");
  const image = metaContent(html, "og:image");
  const siteName = metaContent(html, "og:site_name");
  const bodyExcerpt = html ? stripHtml(extractMainHtml(html)).slice(0, 2000) : "";

  const text =
    [title, description, bodyExcerpt].filter(Boolean).join("\n\n").slice(0, 4000) ||
    title ||
    finalUrl;

  return {
    source: "web",
    external_id: `web:${stableHash(finalUrl)}`,
    author_handle: host,
    author_name: siteName ?? host,
    verified: false,
    text,
    media: (image ? [{ type: "image", url: image }] : []) as unknown as Json,
    engagement: ZERO_ENGAGEMENT,
    posted_at: new Date().toISOString(),
    category_ids: [],
    fetched_at: new Date().toISOString(),
    url: finalUrl,
    purpose: "research",
    added_via: "manual",
  };
}

/** Raw pasted text → a Library "note" post (no URL, no fetch). Dedupes on identical text. */
export function buildNoteInsert(text: string): NormalizedPostInsert {
  const body = text.trim();
  return {
    source: "note",
    external_id: `note:${stableHash(body)}`,
    author_handle: "note",
    author_name: "我嘅筆記",
    verified: false,
    text: body,
    media: [] as unknown as Json,
    engagement: ZERO_ENGAGEMENT,
    posted_at: new Date().toISOString(),
    category_ids: [],
    fetched_at: new Date().toISOString(),
    url: null,
    purpose: "inbox",
    added_via: "manual",
  };
}

const XHS_MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1";

/** Decode a captured JSON string body (handles \n, \uXXXX, \", \/ …). */
function jsonUnescape(raw: string): string {
  try {
    return JSON.parse(`"${raw}"`) as string;
  } catch {
    return raw
      .replace(/\\u002[fF]/g, "/")
      .replace(/\\n/g, "\n")
      .replace(/\\"/g, '"');
  }
}

/** First "<key>":"<value>" string field in 小紅書's embedded note JSON. */
function xhsField(html: string, key: string): string | null {
  const match = html.match(new RegExp(`"${key}":"((?:[^"\\\\]|\\\\.)*)"`));
  const value = match ? jsonUnescape(match[1]).trim() : "";
  return value || null;
}

// 小紅書 share link (xhslink → discovery/item) → free note card. The note page embeds
// title / desc / author / cover in its SSR JSON (no login, no Apify). Deleted/private
// notes 404 → minimal fallback so the link still bookmarks.
async function resolveXiaohongshu(url: string): Promise<NormalizedPostInsert | null> {
  let res: Response;
  try {
    res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
      headers: { "user-agent": XHS_MOBILE_UA },
    });
  } catch {
    return null;
  }
  if (!res.ok) {
    return null;
  }

  const finalUrl = res.url || url;
  const html = await res.text();
  const noteId = finalUrl.match(/\/(?:item|explore)\/([0-9a-f]+)/i)?.[1] ?? null;

  // Expired/blocked share tokens redirect to a /404/ page that embeds a *recommended*
  // note's JSON — scraping it would mislabel the card. Bookmark the dead link honestly.
  if (/\/404\//.test(finalUrl)) {
    return {
      source: "xiaohongshu",
      external_id: `xiaohongshu:${stableHash(url)}`,
      author_handle: "xiaohongshu",
      author_name: "小紅書",
      verified: false,
      text: "小紅書筆記（分享連結已失效 / xsec_token 過期,re-share 一次先抓到內容）",
      media: [] as unknown as Json,
      engagement: ZERO_ENGAGEMENT,
      posted_at: new Date().toISOString(),
      category_ids: [],
      fetched_at: new Date().toISOString(),
      url,
      purpose: "research",
      added_via: "manual",
    };
  }

  const title = xhsField(html, "title");
  const desc = xhsField(html, "desc");
  const author = xhsField(html, "nickname");

  // Cover = first imageList image (sns-webpic host), /-escaped in the JSON.
  const imgMatch = html.match(/"url":"((?:https?:)?(?:\\u002[fF]){2}sns-webpic[^"]+)"/i);
  let cover = imgMatch ? jsonUnescape(imgMatch[1]) : null;
  if (cover && cover.startsWith("http://")) {
    cover = cover.replace(/^http:/, "https:"); // image proxy requires https
  }

  const headline = title ?? "小紅書筆記";
  const text = [title, desc].filter(Boolean).join("\n\n").slice(0, 4000) || headline;

  return {
    source: "xiaohongshu",
    external_id: `xiaohongshu:${noteId ?? stableHash(finalUrl)}`,
    author_handle: author ?? "xiaohongshu",
    author_name: author ?? "小紅書",
    verified: false,
    text,
    media: (cover ? [{ type: "image", url: cover }] : []) as unknown as Json,
    engagement: ZERO_ENGAGEMENT,
    posted_at: new Date().toISOString(),
    category_ids: [],
    fetched_at: new Date().toISOString(),
    url: finalUrl,
    purpose: "research",
    added_via: "manual",
  };
}

async function resolveFacebookRedirectUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      headers: {
        "user-agent": "Mozilla/5.0",
      },
    });
    if (res.url) {
      try {
        const redirected = new URL(res.url);
        const next = redirected.searchParams.get("next");
        if (next && isUsableFacebookPostUrl(next)) {
          return next;
        }
      } catch {
        // fall back to the direct redirected URL check below
      }
    }
    return res.url && isUsableFacebookPostUrl(res.url) ? res.url : url;
  } catch {
    return url;
  }
}

function buildFacebookActorInput(actor: string, url: string): UnknownRecord {
  if (actor.includes("premiumscraper/facebook-posts-scraper")) {
    return {
      facebook_urls: [url],
      include_individual_posts: true,
      include_comments: false,
      posts_count: 1,
    };
  }

  if (actor.includes("kingscraper/facebook-post-scraper")) {
    return { post_urls: [{ url }] };
  }

  if (
    actor.includes("scrapyspider/facebook-post-scraper") ||
    actor.includes("danek/facebook-post-scraper")
  ) {
    return {
      urls: [url],
      proxy: { useApifyProxy: true },
    };
  }

  if (actor.includes("unseenuser/fb-posts")) {
    return {
      mode: "single_post",
      url,
      urls: [url],
      max_posts: 1,
    };
  }

  return buildSinglePostInput("facebook", url);
}

function facebookOEmbedToken(env: ReturnType<typeof getServerEnv>): string | null {
  if (env.FACEBOOK_OEMBED_ACCESS_TOKEN) {
    return env.FACEBOOK_OEMBED_ACCESS_TOKEN;
  }

  if (env.FACEBOOK_APP_ID && env.FACEBOOK_CLIENT_TOKEN) {
    return `${env.FACEBOOK_APP_ID}|${env.FACEBOOK_CLIENT_TOKEN}`;
  }

  return null;
}

function extractFacebookId(url: string): string | null {
  try {
    const parsed = new URL(url);
    return (
      parsed.searchParams.get("story_fbid") ??
      parsed.searchParams.get("fbid") ??
      parsed.searchParams.get("v") ??
      parsed.pathname.split("/").filter(Boolean).at(-1) ??
      null
    );
  } catch {
    return null;
  }
}

function stripHtml(html: string | undefined): string {
  if (!html) {
    return "";
  }

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<span[^>]*class=["'][^"']*text_exposed_hide[^"']*["'][^>]*>[\s\S]*?<\/span>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&#x([0-9a-f]+);/gi, (_match, value: string) =>
      String.fromCodePoint(Number.parseInt(value, 16)),
    )
    .replace(/&#(\d+);/g, (_match, value: string) =>
      String.fromCodePoint(Number.parseInt(value, 10)),
    )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text.replace(/\s+See more\s*$/i, "");
}

function decodeHtmlAttribute(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function facebookImageScore(url: string): number {
  if (!/(^|\.)fbcdn\.net$/i.test(new URL(url).hostname)) {
    return -1;
  }
  if (/static\.xx\.fbcdn\.net/i.test(url) || /\/rsrc\.php\//i.test(url)) {
    return -1;
  }
  if (/s40x40|cp0_dst-jpg_s40x40|\/v\/t\d+\.[\d-]+-1\//i.test(url)) {
    return -1;
  }

  const size = url.match(/s(\d{2,4})x(\d{2,4})/i);
  if (size) {
    return Number(size[1]) * Number(size[2]);
  }

  return 1;
}

function extractDivHtml(html: string, startIndex: number): string | null {
  if (startIndex < 0) {
    return null;
  }

  const start = html.lastIndexOf("<div", startIndex);
  if (start < 0) {
    return null;
  }

  const divTag = /<\/?div\b[^>]*>/gi;
  let depth = 0;

  for (const match of html.slice(start).matchAll(divTag)) {
    const tag = match[0];
    depth += tag.startsWith("</") ? -1 : 1;
    if (depth === 0) {
      const end = start + match.index + tag.length;
      return html.slice(start, end);
    }
  }

  return null;
}

type FacebookPluginPreview = {
  image: string | null;
  text: string | null;
  authorName: string | null;
  authorHandle: string | null;
  postedAt: string | null;
};

function extractFacebookPluginText(html: string): string | null {
  const marker = html.search(/data-testid=["']post_message["']/i);
  const messageHtml = extractDivHtml(html, marker);
  if (!messageHtml) {
    return null;
  }

  const text = stripHtml(messageHtml).trim();
  return text || null;
}

function extractFacebookPluginAuthor(html: string): {
  name: string | null;
  handle: string | null;
} {
  const nameMatch = html.match(
    /<span[^>]+class=["'][^"']*_2_79[^"']*["'][^>]*>([\s\S]*?)<\/span>/i,
  );
  const name = nameMatch ? stripHtml(nameMatch[1]) : null;
  const handleMatch = html.match(/href=["']\/([^"'/?#]+)\/posts\/\d+[^"']*["']/i);
  return {
    name: name || null,
    handle: handleMatch?.[1] ?? null,
  };
}

function extractFacebookPluginPostedAt(html: string): string | null {
  const match = html.match(/data-utime=["'](\d+)["']/i);
  if (!match) {
    return null;
  }

  const timestamp = Number(match[1]);
  if (!Number.isFinite(timestamp)) {
    return null;
  }

  return new Date(timestamp * 1000).toISOString();
}

async function resolveFacebookPluginPreview(url: string): Promise<FacebookPluginPreview> {
  try {
    const params = new URLSearchParams({
      href: url,
      show_text: "true",
      width: "552",
    });
    const res = await fetch(`https://www.facebook.com/plugins/post.php?${params.toString()}`, {
      headers: { "user-agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return {
        image: null,
        text: null,
        authorName: null,
        authorHandle: null,
        postedAt: null,
      };
    }

    const html = await res.text();
    const candidates = [...html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)]
      .map((match) => decodeHtmlAttribute(match[1]))
      .filter((src) => /^https:\/\//i.test(src))
      .map((src) => ({ src, score: facebookImageScore(src) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);
    const author = extractFacebookPluginAuthor(html);

    return {
      image: candidates[0]?.src ?? null,
      text: extractFacebookPluginText(html),
      authorName: author.name,
      authorHandle: author.handle,
      postedAt: extractFacebookPluginPostedAt(html),
    };
  } catch {
    return {
      image: null,
      text: null,
      authorName: null,
      authorHandle: null,
      postedAt: null,
    };
  }
}

async function resolveFacebookOEmbed(
  url: string,
  env: ReturnType<typeof getServerEnv>,
): Promise<NormalizedPostInsert | null> {
  const token = facebookOEmbedToken(env);
  const graphVersion = env.FACEBOOK_GRAPH_VERSION ?? "v25.0";
  const params = new URLSearchParams({ url });
  if (token) {
    params.set("access_token", token);
  }
  const res = await fetch(
    `https://graph.facebook.com/${graphVersion}/oembed_post?${params.toString()}`,
  );

  if (!res.ok) {
    return null;
  }

  const data = (await res.json()) as {
    author_name?: string;
    author_url?: string;
    html?: string;
    provider_name?: string;
  };
  const plugin = await resolveFacebookPluginPreview(url);
  const authorName =
    plugin.authorName ?? data.author_name?.trim() ?? data.provider_name?.trim() ?? "Facebook";
  const handle =
    plugin.authorHandle ??
    facebookHandleFromUrl(data.author_url ?? "") ??
    authorName.replace(/\s+/g, "");
  const text =
    plugin.text ?? (stripHtml(data.html) || `Public Facebook post saved via oEmbed: ${url}`);
  const id = extractFacebookId(url) ?? stableHash(url);

  return {
    source: "facebook",
    external_id: `facebook:${id}`,
    author_handle: handle,
    author_name: authorName,
    verified: false,
    text,
    media: (plugin.image ? [{ type: "image", url: plugin.image }] : []) as unknown as Json,
    engagement: {
      play: 0,
      like: 0,
      comment: 0,
      save: 0,
      share: 0,
    } as unknown as Json,
    posted_at: plugin.postedAt ?? new Date().toISOString(),
    category_ids: [],
    fetched_at: new Date().toISOString(),
    url,
    purpose: "research",
    added_via: "manual",
  };
}

async function resolveFacebook(url: string): Promise<NormalizedPostInsert | null> {
  const env = getServerEnv();
  const resolvedUrl = cleanFacebookInputUrl(await resolveFacebookRedirectUrl(url));
  let apifyError: string | null = null;

  if (env.APIFY_TOKEN) {
    const actor = env.FACEBOOK_APIFY_ACTOR ?? actorBySource.facebook;
    try {
      const client = new ApifyClient({ token: env.APIFY_TOKEN });
      const run = await client.actor(actor).call(buildFacebookActorInput(actor, resolvedUrl));
      const datasetId = run.defaultDatasetId;

      if (datasetId) {
        const dataset = await client.dataset(datasetId).listItems({ limit: 3 });
        const normalized = dataset.items
          .map((item) => normalizeApifyItem("facebook", "library", item))
          .find((item): item is NormalizedPostInsert => Boolean(item));

        if (normalized) {
          return {
            ...normalized,
            category_ids: [],
            added_via: "manual",
            purpose: "research",
            url: normalized.url ?? resolvedUrl,
          };
        }
      }
    } catch (error) {
      apifyError = error instanceof Error ? error.message : "Apify actor failed";
    }
  }

  const oembed = await resolveFacebookOEmbed(resolvedUrl, env);
  if (oembed) {
    return oembed;
  }

  if (!env.APIFY_TOKEN && !facebookOEmbedToken(env)) {
    throw new Error(
      "Facebook public posts need APIFY_TOKEN or FACEBOOK_APP_ID + FACEBOOK_CLIENT_TOKEN / FACEBOOK_OEMBED_ACCESS_TOKEN.",
    );
  }

  throw new Error(
    `Couldn't resolve this public Facebook post. Private/group posts are not supported.${
      apifyError ? ` Apify: ${apifyError}` : ""
    }`,
  );
}

export async function resolveSinglePost(
  source: Source,
  url: string,
): Promise<NormalizedPostInsert | null> {
  if (source === "youtube") {
    return resolveYouTube(url);
  }
  if (source === "facebook") {
    return resolveFacebook(url);
  }
  if (source === "web") {
    return resolveWebArticle(url);
  }
  if (source === "xiaohongshu") {
    return resolveXiaohongshu(url);
  }

  const env = getServerEnv();

  if (source === "ig" || source === "threads" || source === "x") {
    // These three have a non-Apify fallback: when the Apify monthly quota is
    // exhausted (hard limit error) or the actor fails, ScrapeCreators keeps
    // capture alive.
    if (env.APIFY_TOKEN) {
      try {
        const viaApify = await resolveViaApifyActor(source, url, env.APIFY_TOKEN);
        if (viaApify) {
          return viaApify;
        }
      } catch {
        // fall through to ScrapeCreators
      }
    }
    if (source === "threads") {
      return resolveThreadsViaScrapeCreators(url, env.SCRAPECREATORS_API_KEY);
    }
    if (source === "x") {
      return resolveTweetViaScrapeCreators(url, env.SCRAPECREATORS_API_KEY);
    }
    return resolveInstagramViaScrapeCreators(url, env.SCRAPECREATORS_API_KEY);
  }

  if (!env.APIFY_TOKEN) {
    return null;
  }
  return resolveViaApifyActor(source, url, env.APIFY_TOKEN);
}

async function resolveViaApifyActor(
  source: Source,
  url: string,
  token: string,
): Promise<NormalizedPostInsert | null> {
  const client = new ApifyClient({ token });
  const run = await client
    .actor(singlePostActorBySource[source] ?? actorBySource[source])
    .call(buildSinglePostInput(source, url));
  const datasetId = run.defaultDatasetId;

  if (!datasetId) {
    return null;
  }

  const dataset = await client.dataset(datasetId).listItems({ limit: 1 });
  const item = dataset.items[0];

  if (!item) {
    return null;
  }

  const normalized = normalizeApifyItem(source, "library", item);
  if (!normalized) {
    return null;
  }

  // Library posts are uncategorised and flagged manual.
  return {
    ...normalized,
    category_ids: [],
    added_via: "manual",
    url: normalized.url ?? url,
  };
}

// ScrapeCreators (1 credit/request): shared fetch for the per-platform post
// endpoints. Returns null when no API key is configured (fallback disabled).
async function fetchScrapeCreators(
  endpoint: string,
  url: string,
  apiKey: string | undefined,
): Promise<UnknownRecord | null> {
  if (!apiKey) {
    return null;
  }

  const response = await fetch(
    `https://api.scrapecreators.com${endpoint}?url=${encodeURIComponent(url)}`,
    { headers: { "x-api-key": apiKey } },
  );
  if (!response.ok) {
    throw new Error(`ScrapeCreators HTTP ${response.status}`);
  }

  return (await response.json()) as UnknownRecord;
}

// ScrapeCreators GET /v1/instagram/post → reshape into the same flat item the
// Apify IG actor returns, then reuse normalizeApifyItem.
async function resolveInstagramViaScrapeCreators(
  url: string,
  apiKey: string | undefined,
): Promise<NormalizedPostInsert | null> {
  const payload = await fetchScrapeCreators("/v1/instagram/post", url, apiKey);
  if (!payload) {
    return null;
  }

  const media = readNestedRecord(readNestedRecord(payload, ["data"]), ["xdt_shortcode_media"]);
  if (Object.keys(media).length === 0) {
    return null;
  }

  let caption = "";
  const captionEdges = readNestedRecord(media, ["edge_media_to_caption"]).edges;
  if (Array.isArray(captionEdges) && captionEdges.length > 0) {
    caption =
      readString(readNestedRecord(captionEdges[0] as UnknownRecord, ["node"]), ["text"]) ?? "";
  }

  const owner = readNestedRecord(media, ["owner"]);
  const takenAtSeconds = readNumber(media, ["taken_at_timestamp"]);
  const item: UnknownRecord = {
    shortCode: readString(media, ["shortcode"]) ?? undefined,
    caption,
    owner: {
      username: readString(owner, ["username"]) ?? undefined,
      fullName: readString(owner, ["full_name", "fullName"]) ?? undefined,
    },
    takenAt: takenAtSeconds ? new Date(takenAtSeconds * 1000).toISOString() : undefined,
    displayUrl: readString(media, ["display_url", "thumbnail_src"]) ?? undefined,
    videoUrl: readString(media, ["video_url"]) ?? undefined,
    videoViewCount: readNumber(media, ["video_play_count", "video_view_count"]),
    likes: readNumber(readNestedRecord(media, ["edge_media_preview_like"]), ["count"]),
    comments: readNumber(readNestedRecord(media, ["edge_media_to_parent_comment"]), ["count"]),
  };

  const normalized = normalizeApifyItem("ig", "library", item);
  if (!normalized) {
    return null;
  }

  return {
    ...normalized,
    category_ids: [],
    added_via: "manual",
    url: normalized.url ?? url,
  };
}

// ScrapeCreators GET /v1/threads/post → `post` comes back in IG-private-API shape
// (caption.text / user / taken_at / like_count / image_versions2 / video_versions).
async function resolveThreadsViaScrapeCreators(
  url: string,
  apiKey: string | undefined,
): Promise<NormalizedPostInsert | null> {
  const payload = await fetchScrapeCreators("/v1/threads/post", url, apiKey);
  if (!payload) {
    return null;
  }

  const post = readNestedRecord(payload, ["post"]);
  if (Object.keys(post).length === 0) {
    return null;
  }

  const media: MediaItem[] = [];
  const collectMedia = (record: UnknownRecord) => {
    const video = Array.isArray(record.video_versions) ? record.video_versions[0] : null;
    const videoUrl = isRecord(video) ? readString(video, ["url"]) : null;
    if (videoUrl) {
      media.push({ type: "video", url: videoUrl });
    }
    const candidates = readNestedRecord(record, ["image_versions2"]).candidates;
    const imageUrl =
      Array.isArray(candidates) && isRecord(candidates[0])
        ? readString(candidates[0], ["url"])
        : null;
    if (imageUrl) {
      media.push({ type: "image", url: imageUrl });
    }
  };
  collectMedia(post);
  if (Array.isArray(post.carousel_media)) {
    post.carousel_media.filter(isRecord).forEach(collectMedia);
  }

  const user = readNestedRecord(post, ["user"]);
  const takenAtSeconds = readNumber(post, ["taken_at"]);
  const item: UnknownRecord = {
    text: readString(readNestedRecord(post, ["caption"]), ["text"]) ?? "",
    username: readString(user, ["username"]) ?? undefined,
    fullName: readString(user, ["full_name"]) ?? undefined,
    verified: user.is_verified === true,
    timestamp: takenAtSeconds ? new Date(takenAtSeconds * 1000).toISOString() : undefined,
    // Threads permalinks use the shortcode, not the numeric pk, so the code is
    // the external id (readExternalId would otherwise pick canonical_url first).
    postId: readString(post, ["code"]) ?? undefined,
    url: readString(post, ["canonical_url"]) ?? undefined,
    likeCount: readNumber(post, ["like_count"]),
    replyCount: readNumber(readNestedRecord(post, ["text_post_app_info"]), ["direct_reply_count"]),
    media,
  };

  const normalized = normalizeApifyItem("threads", "library", item);
  if (!normalized) {
    return null;
  }

  return {
    ...normalized,
    category_ids: [],
    added_via: "manual",
    url: normalized.url ?? url,
  };
}

// ScrapeCreators GET /v1/twitter/tweet → GraphQL Tweet shape (legacy.full_text,
// core.user_results.result.core.screen_name, views.count).
async function resolveTweetViaScrapeCreators(
  url: string,
  apiKey: string | undefined,
): Promise<NormalizedPostInsert | null> {
  const payload = await fetchScrapeCreators("/v1/twitter/tweet", url, apiKey);
  if (!payload) {
    return null;
  }

  const legacy = readNestedRecord(payload, ["legacy"]);
  if (Object.keys(legacy).length === 0) {
    return null;
  }

  const userResult = readNestedRecord(
    readNestedRecord(readNestedRecord(payload, ["core"]), ["user_results"]),
    ["result"],
  );
  const userCore = readNestedRecord(userResult, ["core"]);

  const media: MediaItem[] = [];
  const entities = readNestedRecord(legacy, ["extended_entities", "entities"]);
  if (Array.isArray(entities.media)) {
    for (const entry of entities.media) {
      if (!isRecord(entry)) {
        continue;
      }
      if (readString(entry, ["type"]) === "photo") {
        const photo = readString(entry, ["media_url_https", "media_url"]);
        if (photo) {
          media.push({ type: "image", url: photo });
        }
        continue;
      }
      const variants = readNestedRecord(entry, ["video_info"]).variants;
      const bestMp4 = Array.isArray(variants)
        ? variants
            .filter(isRecord)
            .filter((variant) => readString(variant, ["content_type"]) === "video/mp4")
            .sort((a, b) => readNumber(b, ["bitrate"]) - readNumber(a, ["bitrate"]))[0]
        : null;
      const videoUrl = bestMp4 ? readString(bestMp4, ["url"]) : null;
      if (videoUrl) {
        media.push({ type: "video", url: videoUrl });
      } else {
        const thumbnail = readString(entry, ["media_url_https", "media_url"]);
        if (thumbnail) {
          media.push({ type: "image", url: thumbnail });
        }
      }
    }
  }

  const item: UnknownRecord = {
    fullText: readString(legacy, ["full_text"]) ?? "",
    tweetId: readString(legacy, ["id_str"]) ?? readString(payload, ["rest_id"]) ?? undefined,
    createdAt: readString(legacy, ["created_at"]) ?? undefined,
    username: readString(userCore, ["screen_name"]) ?? undefined,
    fullName: readString(userCore, ["name"]) ?? undefined,
    verified: userResult.is_blue_verified === true,
    likeCount: readNumber(legacy, ["favorite_count"]),
    replyCount: readNumber(legacy, ["reply_count"]),
    retweetCount: readNumber(legacy, ["retweet_count"]),
    bookmarkCount: readNumber(legacy, ["bookmark_count"]),
    viewCount: readNumber(readNestedRecord(payload, ["views"]), ["count"]),
    media,
  };

  const normalized = normalizeApifyItem("x", "library", item);
  if (!normalized) {
    return null;
  }

  return {
    ...normalized,
    category_ids: [],
    added_via: "manual",
    url: normalized.url ?? url,
  };
}

function shouldSkip(lastRunAt: string | null, force: boolean): boolean {
  if (force || !lastRunAt) {
    return false;
  }

  return Date.now() - new Date(lastRunAt).getTime() < 1000 * 60 * 15;
}

// Mock-mode variant of refreshInspirationFeed: same actors and normalization,
// but categories come from the local store and results land in the local feed
// store. No cursor tracking — the UI always passes force=true anyway.
async function refreshLocalInspirationFeed(
  token: string,
  opts?: {
    categoryFilter?: (category: Category) => boolean;
    sources?: Source[];
  },
): Promise<RefreshResult[]> {
  const allCategories = await getLocalCategories();
  const categories = opts?.categoryFilter
    ? allCategories.filter(opts.categoryFilter)
    : allCategories;
  const client = new ApifyClient({ token });
  const sources: Source[] = opts?.sources ?? ["x", "threads", "ig"];
  const results: RefreshResult[] = [];

  for (const category of categories) {
    const query = buildQuery(category);
    if (!query) {
      continue;
    }

    for (const source of sources) {
      try {
        const run = await client
          .actor(actorBySource[source])
          .call(buildActorInput(source, query, null));
        const datasetId = run.defaultDatasetId;
        if (!datasetId) {
          results.push({ source, categoryId: category.id, fetched: 0, skipped: false, error: "Actor run did not return a dataset" });
          continue;
        }
        const dataset = await client.dataset(datasetId).listItems({ limit: 25 });
        const items = normalizeApifyItems(source, category.id, dataset.items);
        await upsertLocalFeedRows(items);
        if (items.length > 0) {
          const warm = await warmThumbnailCache(
            items.flatMap((item) =>
              parseMedia(item.media ?? [])
                .filter((media) => media.type === "image")
                .map((media) => media.url),
            ),
          );
          console.log("[thumbnail warm local]", JSON.stringify({ source, categoryId: category.id, ...warm }));
        }
        results.push({ source, categoryId: category.id, fetched: items.length, skipped: false });
      } catch (error) {
        results.push({
          source,
          categoryId: category.id,
          fetched: 0,
          skipped: false,
          error: error instanceof Error ? error.message : "Unknown Apify error",
        });
      }
    }
  }

  return results;
}

export async function refreshInspirationFeed(
  force = false,
  opts?: {
    categoryFilter?: (category: Category) => boolean;
    sources?: Source[];
  },
): Promise<RefreshResult[]> {
  const env = getServerEnv();
  const supabase = createSupabaseAdminClient();

  if (!env.APIFY_TOKEN) {
    return [
      {
        source: "x",
        categoryId: "env",
        fetched: 0,
        skipped: true,
        error: "Missing APIFY_TOKEN",
      },
    ];
  }

  // Local mock mode: crawl with Apify but persist into the .hermes feed store
  // instead of Supabase, so Force Refresh works on the Mini too.
  if (!supabase) {
    return refreshLocalInspirationFeed(env.APIFY_TOKEN, opts);
  }

  const { data: categoryRows, error: categoryError } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });

  if (categoryError) {
    throw new Error(categoryError.message);
  }

  const allCategories = categoryRows.map(mapCategory);
  const categories = opts?.categoryFilter
    ? allCategories.filter(opts.categoryFilter)
    : allCategories;
  const client = new ApifyClient({ token: env.APIFY_TOKEN });
  const sources: Source[] = opts?.sources ?? ["x", "threads", "ig"];
  const results: RefreshResult[] = [];

  for (const category of categories) {
    const query = buildQuery(category);
    if (!query) {
      continue;
    }

    for (const source of sources) {
      const { data: cursorRow } = await supabase
        .from("scrape_cursors")
        .select("*")
        .eq("source", source)
        .eq("category_id", category.id)
        .maybeSingle();

      if (shouldSkip(cursorRow?.last_run_at ?? null, force)) {
        results.push({
          source,
          categoryId: category.id,
          fetched: 0,
          skipped: true,
        });
        continue;
      }

      try {
        const run = await client
          .actor(actorBySource[source])
          .call(buildActorInput(source, query, cursorRow?.last_cursor ?? null));
        const datasetId = run.defaultDatasetId;

        if (!datasetId) {
          results.push({
            source,
            categoryId: category.id,
            fetched: 0,
            skipped: false,
            error: "Actor run did not return a dataset",
          });
          continue;
        }

        const dataset = await client.dataset(datasetId).listItems({ limit: 50 });
        const items = normalizeApifyItems(source, category.id, dataset.items);

        if (items.length > 0) {
          // Signed CDN thumbnails die days after the crawl — snapshot them into
          // permanent Supabase Storage BEFORE upsert (mutates item.media), so
          // prod cards never go black. Failures keep the original URL.
          await Promise.allSettled(items.map((item) => snapshotInsertImage(supabase, item)));

          const { error } = await supabase.from("posts").upsert(items, {
            onConflict: "external_id",
          });
          if (error) {
            throw new Error(error.message);
          }

          // Belt-and-braces for non-Vercel runs: disk-cache the (possibly
          // already-permanent) image URLs too.
          const warm = await warmThumbnailCache(
            items.flatMap((item) =>
              parseMedia(item.media ?? [])
                .filter((media) => media.type === "image")
                .map((media) => media.url),
            ),
          );
          console.log("[thumbnail warm]", JSON.stringify({ source, categoryId: category.id, ...warm }));
        }

        await supabase.from("scrape_cursors").upsert({
          source,
          category_id: category.id,
          last_cursor: datasetId,
          last_run_at: new Date().toISOString(),
        });

        results.push({
          source,
          categoryId: category.id,
          fetched: items.length,
          skipped: false,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown Apify error";
        results.push({
          source,
          categoryId: category.id,
          fetched: 0,
          skipped: false,
          error: message,
        });
      }
    }
  }

  return results;
}
