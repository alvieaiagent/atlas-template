import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";
import { getLocalLibraryPosts, upsertLocalLibraryPost } from "@/lib/local-library";
import { parseMedia } from "@/lib/mappers";
import { resolveSinglePost } from "@/lib/scraping/apify";
import { readCachedThumbnail, warmThumbnailCache } from "@/lib/thumbnail-cache";

export const maxDuration = 300;

// One-shot repair: re-crawl posts whose thumbnails died (signed CDN URL expired
// before we cached it), refresh their media URLs in the local store, and cache
// the new image to disk. Needs APIFY_TOKEN (or the ScrapeCreators fallback key).
// Protected by the login-cookie middleware in production; open on localhost.
export async function POST(): Promise<NextResponse> {
  const env = getServerEnv();
  if (!env.APIFY_TOKEN && !env.SCRAPECREATORS_API_KEY) {
    return NextResponse.json(
      { ok: false, error: "No APIFY_TOKEN / SCRAPECREATORS_API_KEY configured — add one to .env.local first." },
      { status: 400 },
    );
  }

  const posts = await getLocalLibraryPosts();
  const results: { id: string; url: string | null; status: string }[] = [];

  for (const post of posts) {
    const firstImage = post.media.find((media) => media.type === "image");
    if (!firstImage || !post.url) {
      continue;
    }
    if (await readCachedThumbnail(firstImage.url)) {
      results.push({ id: post.id, url: post.url, status: "already-cached" });
      continue;
    }

    // Try the stored URL once more before spending a crawl on it.
    const direct = await warmThumbnailCache([firstImage.url]);
    if (direct.cached > 0) {
      results.push({ id: post.id, url: post.url, status: "cached-from-stored-url" });
      continue;
    }

    try {
      const fresh = await resolveSinglePost(post.source, post.url);
      const freshImages = fresh
        ? parseMedia(fresh.media ?? []).filter((media) => media.type === "image")
        : [];
      if (!freshImages.length) {
        results.push({ id: post.id, url: post.url, status: "recrawl-no-image" });
        continue;
      }
      const warm = await warmThumbnailCache(freshImages.map((media) => media.url));
      if (warm.cached > 0) {
        // Point the stored card at the fresh URL so the proxy cache key matches.
        await upsertLocalLibraryPost({
          ...post,
          media: [
            ...freshImages,
            ...post.media.filter((media) => media.type !== "image"),
          ],
        });
        results.push({ id: post.id, url: post.url, status: "rescued" });
      } else {
        results.push({ id: post.id, url: post.url, status: "recrawl-image-unfetchable" });
      }
    } catch (error) {
      results.push({
        id: post.id,
        url: post.url,
        status: `error: ${error instanceof Error ? error.message : "unknown"}`,
      });
    }
  }

  const rescued = results.filter((r) => r.status === "rescued").length;
  const stillDead = results.filter((r) => r.status.startsWith("recrawl") || r.status.startsWith("error")).length;
  return NextResponse.json({ ok: true, rescued, stillDead, results });
}
