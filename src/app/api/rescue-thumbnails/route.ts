import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getServerEnv } from "@/lib/env";
import { getLocalLibraryPosts, upsertLocalLibraryPost } from "@/lib/local-library";
import { parseMedia } from "@/lib/mappers";
import { resolveSinglePost } from "@/lib/scraping/apify";
import { ensureThumbnailBucket, snapshotImage } from "@/lib/scraping/snapshot";
import { readCachedThumbnail, warmThumbnailCache } from "@/lib/thumbnail-cache";
import type { Json } from "@/lib/database.types";

export const maxDuration = 60;

// Thumbnail repair, both modes:
// - Supabase (prod): snapshot each post's first image into permanent Storage;
//   if the CDN URL already expired, re-crawl via resolveSinglePost first.
//   Processes a batch per call (Vercel time limit) — call again until remaining=0.
// - Local mock mode: same idea against the .hermes disk cache/local store.
// Protected by the login-cookie middleware in production; open on localhost.
// GET so Alvie can trigger it from the logged-in browser address bar.

async function rescueSupabase(limit: number): Promise<NextResponse> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error("unreachable");
  }
  await ensureThumbnailBucket(supabase);

  const { data: rows, error } = await supabase
    .from("posts")
    .select("id, external_id, url, source, media")
    .order("posted_at", { ascending: false })
    .limit(500);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const candidates = (rows ?? []).filter((row) => {
    const firstImage = parseMedia(row.media).find((media) => media.type === "image");
    return firstImage && !firstImage.url.includes("/storage/v1/object/public/");
  });

  const batch = candidates.slice(0, limit);
  const results: { id: string; status: string }[] = [];

  for (const row of batch) {
    const media = parseMedia(row.media);
    const firstImage = media.find((item) => item.type === "image");
    if (!firstImage) continue;
    const key = String(row.external_id ?? row.id).replace(/[^a-z0-9]/gi, "_").slice(0, 80);

    try {
      // 1. URL still alive → snapshot straight into Storage.
      let permanent = await snapshotImage(supabase, firstImage.url, key);

      // 2. Expired → re-crawl for a fresh URL, then snapshot that.
      if (!permanent && row.url) {
        const fresh = await resolveSinglePost(row.source, row.url);
        const freshImage = fresh
          ? parseMedia(fresh.media ?? []).find((item) => item.type === "image")
          : undefined;
        if (freshImage) {
          permanent = await snapshotImage(supabase, freshImage.url, key);
        }
      }

      if (!permanent) {
        results.push({ id: row.id, status: "still-dead" });
        continue;
      }

      const newMedia = media.map((item) =>
        item === firstImage ? { ...item, url: permanent } : item,
      ) as unknown as Json;
      const { error: updateError } = await supabase
        .from("posts")
        .update({ media: newMedia })
        .eq("id", row.id);
      results.push({ id: row.id, status: updateError ? `update-failed: ${updateError.message}` : "rescued" });
    } catch (err) {
      results.push({ id: row.id, status: `error: ${err instanceof Error ? err.message : "unknown"}` });
    }
  }

  const rescued = results.filter((r) => r.status === "rescued").length;
  return NextResponse.json({
    ok: true,
    mode: "supabase",
    rescued,
    stillDead: results.length - rescued,
    remaining: candidates.length - batch.length,
    hint: candidates.length - batch.length > 0 ? "Reload this URL to process the next batch." : "All done.",
    results,
  });
}

async function rescueLocal(): Promise<NextResponse> {
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
  return NextResponse.json({ ok: true, mode: "local", rescued, stillDead, results });
}

async function run(request: Request): Promise<NextResponse> {
  const limitParam = Number(new URL(request.url).searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 15;
  const supabase = createSupabaseAdminClient();
  return supabase ? rescueSupabase(limit) : rescueLocal();
}

export async function GET(request: Request): Promise<NextResponse> {
  return run(request);
}

export async function POST(request: Request): Promise<NextResponse> {
  return run(request);
}
