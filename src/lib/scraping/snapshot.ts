import type { SupabaseClient } from "@supabase/supabase-js";
import type { Json } from "@/lib/database.types";
import { parseMedia } from "@/lib/mappers";

// IG / fbcdn (and 小紅書) CDN image URLs are signed and expire in ~days, so a saved
// Library card goes black once the link dies. Fix: at capture time (URL still fresh)
// download the thumbnail into our own public Storage bucket and serve that permanent
// copy. Supabase Storage public URLs never expire and allow hotlinking — no proxy needed.

export const THUMBNAIL_BUCKET = "thumbnails";

const BROWSER_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
  referer: "https://www.instagram.com/",
};

/** Create the public thumbnails bucket if missing (idempotent — ignores "already exists"). */
export async function ensureThumbnailBucket(
  supabase: SupabaseClient,
): Promise<void> {
  await supabase.storage.createBucket(THUMBNAIL_BUCKET, { public: true });
}

/**
 * Download an image while its CDN URL is still alive and upload it to the public
 * `thumbnails` bucket. Returns a permanent public URL, or null on any failure
 * (caller keeps the original URL). `key` should be a stable per-post id.
 */
export async function snapshotImage(
  supabase: SupabaseClient,
  url: string,
  key: string,
): Promise<string | null> {
  let contentType = "image/jpeg";
  let bytes: Uint8Array;
  try {
    const res = await fetch(url, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    contentType = res.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) return null;
    // arrayBuffer() can also reject if the signal fires mid-download — keep it inside the try.
    bytes = new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
  if (bytes.byteLength === 0 || bytes.byteLength > 5_000_000) return null;

  const ext = contentType.includes("png")
    ? "png"
    : contentType.includes("webp")
      ? "webp"
      : "jpg";
  const path = `${key}.${ext}`;

  const { error } = await supabase.storage
    .from(THUMBNAIL_BUCKET)
    .upload(path, bytes, { contentType, upsert: true });
  if (error) return null;

  const { data } = supabase.storage.from(THUMBNAIL_BUCKET).getPublicUrl(path);
  return data?.publicUrl ?? null;
}

type HasMedia = { media?: Json | null; external_id?: string | null };

/** Mutate `insert.media` so its first image points at a permanent Storage copy. No-op
 *  if there's no image, it's already snapshotted, or the download/upload fails. */
export async function snapshotInsertImage(
  supabase: SupabaseClient,
  insert: HasMedia,
): Promise<void> {
  const media = parseMedia(insert.media ?? []);
  const firstImage = media.find((m) => m.type === "image");
  if (!firstImage) return;
  if (firstImage.url.includes("/storage/v1/object/public/")) return; // already ours

  const key = String(insert.external_id ?? "img")
    .replace(/[^a-z0-9]/gi, "_")
    .slice(0, 80);
  const permanent = await snapshotImage(supabase, firstImage.url, key);
  if (!permanent) return;

  insert.media = media.map((m) =>
    m === firstImage ? { ...m, url: permanent } : m,
  ) as unknown as Json;
}
