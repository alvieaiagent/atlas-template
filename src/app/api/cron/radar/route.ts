import { NextRequest, NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";
import { refreshInspirationFeed } from "@/lib/scraping/apify";

// 🛰️ AI Radar cron — scrapes ONLY the radar categories (sortOrder >= 100) on X
// to keep Apify cost down. The /radar page reads the results from the DB.

export async function GET(request: NextRequest) {
  const env = getServerEnv();
  const authHeader = request.headers.get("authorization");

  // Fail closed: this endpoint spends Apify, so require CRON_SECRET to be set AND match.
  if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Cost-scoped scrape: radar categories only, X only.
  const scraped = await refreshInspirationFeed(false, {
    categoryFilter: (category) => category.sortOrder >= 100,
    sources: ["x"],
  });

  return NextResponse.json({ ok: true, scraped });
}
