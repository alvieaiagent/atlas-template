import type { Database, Json } from "@/lib/database.types";
import {
  DEFAULT_ENGAGEMENT,
  type Category,
  type Engagement,
  type MediaItem,
  type Post,
} from "@/lib/types";

type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
type PostRow = Database["public"]["Tables"]["posts"]["Row"];

function isRecord(value: Json | undefined): value is Record<string, Json | undefined> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toNumber(value: Json | undefined): number {
  return typeof value === "number" ? value : 0;
}

export function parseEngagement(value: Json): Engagement {
  if (!isRecord(value)) {
    return DEFAULT_ENGAGEMENT;
  }

  return {
    play: toNumber(value.play),
    like: toNumber(value.like),
    comment: toNumber(value.comment),
    save: toNumber(value.save),
    share: toNumber(value.share),
  };
}

export function parseMedia(value: Json): MediaItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }

    const type = item.type;
    const url = item.url;

    if ((type === "image" || type === "video") && typeof url === "string") {
      return [{ type, url }];
    }

    return [];
  });
}

export function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    keywords: row.keywords,
    accounts: row.accounts,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

export function mapPost(row: PostRow, markedPostIds: Set<string>): Post {
  return {
    id: row.id,
    source: row.source,
    externalId: row.external_id,
    authorHandle: row.author_handle,
    authorName: row.author_name,
    verified: row.verified,
    text: row.text,
    media: parseMedia(row.media),
    engagement: parseEngagement(row.engagement),
    postedAt: row.posted_at,
    categoryIds: row.category_ids,
    fetchedAt: row.fetched_at,
    url: row.url,
    purpose: row.purpose,
    marked: markedPostIds.has(row.id),
    used: (row as { used?: boolean }).used ?? false,
  };
}

export function splitCsv(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
