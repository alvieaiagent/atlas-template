import type { Post, Source } from "@/lib/types";

/**
 * Build a best-effort canonical permalink from a platform id.
 * Returns null when the id is a fallback (generated/seed) that can't form a real URL.
 */
export function derivePostUrl(
  source: Source,
  handle: string,
  rawId: string | null,
): string | null {
  if (!rawId || rawId.startsWith("generated:") || rawId.startsWith("seed:")) {
    return null;
  }

  const cleanHandle = handle.replace(/^@/, "");

  switch (source) {
    case "x":
      return `https://x.com/${cleanHandle}/status/${rawId}`;
    case "threads":
      return `https://www.threads.net/@${cleanHandle}/post/${rawId}`;
    case "ig":
      return `https://www.instagram.com/p/${rawId}/`;
    case "youtube":
      return `https://www.youtube.com/watch?v=${rawId}`;
    case "facebook":
      return `https://www.facebook.com/${cleanHandle}/posts/${rawId}`;
    default:
      return null;
  }
}

function stripSourcePrefix(source: Source, externalId: string): string {
  const prefix = `${source}:`;
  return externalId.startsWith(prefix)
    ? externalId.slice(prefix.length)
    : externalId;
}

/**
 * Canonical URL for a post: the persisted url when present, otherwise a derived permalink.
 */
export function getPostUrl(post: Post): string | null {
  if (post.url && /^https?:\/\//.test(post.url)) {
    return post.url;
  }

  return derivePostUrl(
    post.source,
    post.authorHandle,
    stripSourcePrefix(post.source, post.externalId),
  );
}
