import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { refreshRadarFromFeeds } from "@/lib/scraping/feeds-free";

// Manual "抓最新" trigger for the radar column. Pulls the latest AI tools/news
// from FREE, datacenter-friendly feeds (Hacker News + Product Hunt) — no Apify,
// no key, and works from Vercel (Twitter's syndication endpoint 429s datacenter IPs).
export const maxDuration = 60;

async function run() {
  const results = await refreshRadarFromFeeds();
  const fetched = results.reduce((sum, r) => sum + r.fetched, 0);
  // Visible in Vercel runtime logs for diagnosis.
  console.log("[radar refresh]", JSON.stringify({ fetched, results }));
  revalidatePath("/radar");
  return { fetched, results };
}

// The "抓最新" button (form POST) → run, then redirect back to /radar with the
// count. Redirect origin is derived from the request so it always returns to the
// same host (prod domain), not a stale NEXT_PUBLIC_APP_URL.
export async function POST(request: Request) {
  const { fetched } = await run();
  return NextResponse.redirect(
    new URL(`/radar?refresh=${fetched}`, request.url),
    { status: 303 },
  );
}

// Debug: open this URL in the browser (while logged in) to see per-account
// results as JSON — tells us exactly what each handle returned on Vercel.
export async function GET() {
  const { fetched, results } = await run();
  return NextResponse.json({ fetched, results });
}
