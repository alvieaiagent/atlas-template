import type { Source } from "@/lib/types";

/**
 * Detect the Atlas source from a pasted URL. Known social hosts map to their platform;
 * any other valid http(s) URL falls through to "web" (generic article/link). Returns null
 * only for unparseable input or non-web protocols (mailto:, javascript:, …).
 */
export function detectSource(url: string): Source | null {
  let host: string;
  let protocol: string;
  try {
    const parsed = new URL(url);
    host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    protocol = parsed.protocol;
  } catch {
    return null;
  }

  if (host === "instagram.com" || host.endsWith(".instagram.com") || host === "instagr.am") {
    return "ig";
  }
  if (
    host === "threads.net" ||
    host.endsWith(".threads.net") ||
    host === "threads.com" ||
    host.endsWith(".threads.com")
  ) {
    return "threads";
  }
  if (
    host === "x.com" ||
    host.endsWith(".x.com") ||
    host === "twitter.com" ||
    host.endsWith(".twitter.com")
  ) {
    return "x";
  }
  if (
    host === "youtube.com" ||
    host.endsWith(".youtube.com") ||
    host === "youtu.be"
  ) {
    return "youtube";
  }
  if (
    host === "facebook.com" ||
    host.endsWith(".facebook.com") ||
    host === "fb.com" ||
    host.endsWith(".fb.com") ||
    host === "fb.watch" ||
    host.endsWith(".fb.watch") ||
    host === "fb.me" ||
    host.endsWith(".fb.me")
  ) {
    return "facebook";
  }
  if (
    host === "xiaohongshu.com" ||
    host.endsWith(".xiaohongshu.com") ||
    host === "xhslink.com" ||
    host.endsWith(".xhslink.com") ||
    host === "xhscdn.com" ||
    host.endsWith(".xhscdn.com")
  ) {
    return "xiaohongshu";
  }

  // Any other real web link → generic "web" article (resolved free, no Apify).
  if (protocol === "http:" || protocol === "https:") {
    return "web";
  }

  return null;
}

/**
 * Apify actor input to resolve ONE post from a URL (item cap 1). IG `directUrls` is the
 * reliable path; X/Threads inputs are best-effort and may need calibration against the
 * actor's current schema (see src/lib/scraping/apify.ts).
 */
export function buildSinglePostInput(
  source: Source,
  url: string,
): Record<string, unknown> {
  switch (source) {
    case "ig":
      return {
        directUrls: [url],
        resultsType: "posts",
        resultsLimit: 1,
        addParentData: false,
      };
    case "threads":
      // logical_scrapers/threads-post-scraper expects startUrls: [{ url }].
      return { startUrls: [{ url }], maxItems: 1 };
    case "x":
      return { startUrls: [url], maxItems: 1, sort: "Latest" };
    case "youtube":
      // Resolved via oEmbed (resolveSinglePost), not Apify — input unused.
      return { url };
    case "facebook":
      return {
        post_urls: [{ url }],
      };
    case "web":
    case "note":
    case "xiaohongshu":
      // Resolved without Apify (free web fetch / raw text / xhs JSON) — input unused.
      return {};
  }
}
