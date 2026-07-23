import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { isAllowedImageUrl } from "@/lib/image-proxy";

// Social CDN URLs (fbcdn / cdninstagram) are signed and expire after a few weeks.
// First successful proxy fetch is written here so thumbnails keep working after
// the upstream URL dies. Cache key ignores the signature params, so a refreshed
// URL for the same asset hits the same cache entry.
const cacheDir = join(process.cwd(), ".hermes", "thumbnails");

// Signature/session params IG rotates per fetch; stripping them keys the cache
// on the stable asset path instead of the ephemeral signed URL.
const VOLATILE_PARAMS = ["oh", "oe", "_nc_gid", "_nc_ohc", "_nc_oc", "_nc_sid", "_nc_zt", "ccb", "ig_cache_key"];

function cacheKey(url: string): string {
  let stable = url;
  try {
    const parsed = new URL(url);
    VOLATILE_PARAMS.forEach((param) => parsed.searchParams.delete(param));
    stable = parsed.toString();
  } catch {
    // fall through: hash the raw string
  }
  return createHash("sha256").update(stable).digest("hex");
}

export type CachedThumbnail = {
  body: Buffer;
  contentType: string;
};

export async function readCachedThumbnail(url: string): Promise<CachedThumbnail | null> {
  const key = cacheKey(url);
  try {
    const [body, meta] = await Promise.all([
      readFile(join(cacheDir, key)),
      readFile(join(cacheDir, `${key}.json`), "utf8"),
    ]);
    return { body, contentType: (JSON.parse(meta) as { contentType?: string }).contentType ?? "image/jpeg" };
  } catch {
    return null;
  }
}

export async function writeCachedThumbnail(url: string, body: Buffer, contentType: string): Promise<void> {
  const key = cacheKey(url);
  await mkdir(cacheDir, { recursive: true });
  await Promise.all([
    writeFile(join(cacheDir, key), body),
    writeFile(join(cacheDir, `${key}.json`), `${JSON.stringify({ contentType, url })}\n`),
  ]);
}

// Browser-like headers: IG/fbcdn CDN 對 datacenter IP / 冇 referer 嘅請求會擋,
// 扮成由 instagram.com hotlink 嘅瀏覽器請求先攞到圖。
export const THUMBNAIL_FETCH_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
  referer: "https://www.instagram.com/",
} as const;

// Fetch-and-cache for freshly crawled media URLs. Signed CDN URLs die within
// days of a crawl, so we grab them at ingest time instead of waiting for a page
// view. Failures are silently skipped — the card falls back to its text-only UI.
export async function warmThumbnailCache(urls: string[]): Promise<{ cached: number; failed: number }> {
  let cached = 0;
  let failed = 0;
  await Promise.allSettled(
    urls.map(async (url) => {
      if (!isAllowedImageUrl(url) || (await readCachedThumbnail(url))) {
        return;
      }
      try {
        const res = await fetch(url, { headers: THUMBNAIL_FETCH_HEADERS });
        if (!res.ok) {
          failed++;
          return;
        }
        await writeCachedThumbnail(
          url,
          Buffer.from(await res.arrayBuffer()),
          res.headers.get("content-type") ?? "image/jpeg",
        );
        cached++;
      } catch {
        failed++;
      }
    }),
  );
  return { cached, failed };
}
