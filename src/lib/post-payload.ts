import type { Database, Json } from "@/lib/database.types";
import { isPurpose } from "@/lib/types";
import type { Engagement, MediaItem, Post, Source } from "@/lib/types";

type PostInsert = Database["public"]["Tables"]["posts"]["Insert"];
type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSource(value: unknown): value is Source {
  return (
    value === "x" ||
    value === "threads" ||
    value === "ig" ||
    value === "youtube" ||
    value === "facebook" ||
    value === "web" ||
    value === "note" ||
    value === "xiaohongshu"
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isMedia(value: unknown): value is MediaItem[] {
  return (
    Array.isArray(value) &&
    value.every((item) => {
      if (!isRecord(item)) {
        return false;
      }

      return (
        (item.type === "image" || item.type === "video") &&
        typeof item.url === "string"
      );
    })
  );
}

function isEngagement(value: unknown): value is Engagement {
  if (!isRecord(value)) {
    return false;
  }

  return ["play", "like", "comment", "save", "share"].every(
    (key) => typeof value[key] === "number",
  );
}

export function parsePostPayload(value: FormDataEntryValue | null): Post | null {
  if (typeof value !== "string") {
    return null;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(value) as unknown;
  } catch {
    return null;
  }

  if (!isRecord(parsed)) {
    return null;
  }

  if (
    typeof parsed.id !== "string" ||
    !isSource(parsed.source) ||
    typeof parsed.externalId !== "string" ||
    typeof parsed.authorHandle !== "string" ||
    typeof parsed.authorName !== "string" ||
    typeof parsed.verified !== "boolean" ||
    typeof parsed.text !== "string" ||
    !isMedia(parsed.media) ||
    !isEngagement(parsed.engagement) ||
    typeof parsed.postedAt !== "string" ||
    !isStringArray(parsed.categoryIds) ||
    typeof parsed.fetchedAt !== "string" ||
    typeof parsed.marked !== "boolean"
  ) {
    return null;
  }

  return {
    id: parsed.id,
    source: parsed.source,
    externalId: parsed.externalId,
    authorHandle: parsed.authorHandle,
    authorName: parsed.authorName,
    verified: parsed.verified,
    text: parsed.text,
    media: parsed.media,
    engagement: parsed.engagement,
    postedAt: parsed.postedAt,
    categoryIds: parsed.categoryIds,
    fetchedAt: parsed.fetchedAt,
    url: typeof parsed.url === "string" ? parsed.url : null,
    purpose: isPurpose(parsed.purpose) ? parsed.purpose : "inbox",
    marked: parsed.marked,
    used: typeof parsed.used === "boolean" ? parsed.used : false,
  };
}

export function postToInsert(post: Post): PostInsert {
  return {
    source: post.source,
    external_id: post.externalId,
    author_handle: post.authorHandle,
    author_name: post.authorName,
    verified: post.verified,
    text: post.text,
    media: post.media as unknown as Json,
    engagement: post.engagement as unknown as Json,
    posted_at: post.postedAt,
    category_ids: post.categoryIds,
    fetched_at: post.fetchedAt,
    url: post.url,
    purpose: post.purpose,
  };
}
