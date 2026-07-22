import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { refreshInspirationFeed } from "@/lib/scraping/apify";
import { SOURCES, type Source } from "@/lib/types";

export const maxDuration = 60;

function parseSources(formData: FormData): Source[] | undefined {
  const raw = formData.get("sources");
  if (typeof raw !== "string" || raw === "all") {
    return undefined;
  }
  const requested = raw.split(",").filter((source): source is Source =>
    SOURCES.some((item) => item.source === source),
  );
  return requested.length ? requested : undefined;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const categoryId = formData.get("category");
  const results = await refreshInspirationFeed(true, {
    categoryFilter:
      typeof categoryId === "string" && categoryId
        ? (category) => category.id === categoryId
        : undefined,
    sources: parseSources(formData),
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
