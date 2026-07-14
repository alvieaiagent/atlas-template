import { isAllowedImageUrl } from "@/lib/image-proxy";

// Server-side image proxy: fetches an allow-listed CDN image and streams it back same-origin,
// so the browser can render Instagram / Threads thumbnails that block cross-origin hotlinking.
export async function GET(request: Request): Promise<Response> {
  const target = new URL(request.url).searchParams.get("url");

  if (!target || !isAllowedImageUrl(target)) {
    return new Response("forbidden", { status: 403 });
  }

  let upstream: Response;
  try {
    // Browser-like headers: IG/fbcdn CDN 對 datacenter IP / 冇 referer 嘅請求會擋,
    // 扮成由 instagram.com hotlink 嘅瀏覽器請求,提高喺 Vercel server 攞到圖嘅機會。
    upstream = await fetch(target, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        referer: "https://www.instagram.com/",
      },
    });
  } catch {
    return new Response("upstream fetch failed", { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return new Response("upstream error", { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") ?? "image/jpeg";

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
