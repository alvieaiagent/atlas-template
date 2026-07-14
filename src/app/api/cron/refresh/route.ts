import { NextRequest, NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";
import { refreshInspirationFeed } from "@/lib/scraping/apify";

export async function GET(request: NextRequest) {
  const env = getServerEnv();
  const authHeader = request.headers.get("authorization");

  if (env.CRON_SECRET && authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await refreshInspirationFeed(false);
  return NextResponse.json({ ok: true, results });
}
