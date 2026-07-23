import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { refreshInspirationFeed } from "@/lib/scraping/apify";
import { SOURCES, type Source } from "@/lib/types";

export const maxDuration = 60;

// "all" / missing = whatever the Settings 資料來源 toggles enable (cookie;
// Threads is off by default because its search actor is ~7x the cost of X/IG).
function parseSources(formData: FormData, request: Request): Source[] | undefined {
  const raw = formData.get("sources");
  if (typeof raw === "string" && raw !== "all") {
    const requested = raw.split(",").filter((source): source is Source =>
      SOURCES.some((item) => item.source === source),
    );
    if (requested.length) {
      return requested;
    }
  }

  const feedSources: Source[] = ["x", "threads", "ig"];
  const defaults: Source[] = ["x", "ig"];
  const cookie = request.headers
    .get("cookie")
    ?.match(/(?:^|; )atlas-sources=([^;]*)/)?.[1];
  if (!cookie) {
    return defaults;
  }
  try {
    const parsed = JSON.parse(decodeURIComponent(cookie)) as Partial<Record<Source, unknown>>;
    const enabled = feedSources.filter((source) =>
      typeof parsed[source] === "boolean" ? parsed[source] : defaults.includes(source),
    );
    return enabled.length ? enabled : defaults;
  } catch {
    return defaults;
  }
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const categoryId = formData.get("category");
  const results = await refreshInspirationFeed(true, {
    categoryFilter:
      typeof categoryId === "string" && categoryId
        ? (category) => category.id === categoryId
        : undefined,
    sources: parseSources(formData, request),
  });
  const fetched = results.reduce((sum, result) => sum + result.fetched, 0);
  const errors = results.filter((result) => result.error).length;

  console.log("[inspiration refresh]", JSON.stringify({ fetched, errors, results }));
  revalidatePath("/inspiration");

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const url = new URL("/inspiration", host ? `${proto}://${host}` : request.url);
  if (categoryId && typeof categoryId === "string") {
    url.searchParams.set("category", categoryId);
  }
  url.searchParams.set("refresh", String(fetched));
  if (errors) {
    url.searchParams.set("errors", String(errors));
  }
  return NextResponse.redirect(url, { status: 303 });
}
