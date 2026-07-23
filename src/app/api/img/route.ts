import { isAllowedImageUrl } from "@/lib/image-proxy";
import {
  readCachedThumbnail,
  THUMBNAIL_FETCH_HEADERS,
  writeCachedThumbnail,
} from "@/lib/thumbnail-cache";

// Server-side image proxy: fetches an allow-listed CDN image and streams it back same-origin,
// so the browser can render Instagram / Threads thumbnails that block cross-origin hotlinking.
// Successful fetches are cached to disk (.hermes/thumbnails) because these CDN URLs are signed
// and expire — the cache keeps thumbnails alive after the upstream URL dies.
export async function GET(request: Request): Promise<Response> {
  const target = new URL(request.url).searchParams.get("url");

  if (!target || !isAllowedImageUrl(target)) {
    return new Response("forbidden", { status: 403 });
  }

  const cached = await readCachedThumbnail(target);
  if (cached) {
    return new Response(new Uint8Array(cached.body), {
      status: 200,
      headers: {
        "Content-Type": cached.contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, { headers: THUMBNAIL_FETCH_HEADERS });
  } catch {
    return new Response("upstream fetch failed", { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return new Response("upstream error", { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
  const body = Buffer.from(await upstream.arrayBuffer());

  try {
    await writeCachedThumbnail(target, body, contentType);
  } catch {
    // Cache write failure must not break image serving (e.g. read-only FS on Vercel).
  }

  return new Response(new Uint8Array(body), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
