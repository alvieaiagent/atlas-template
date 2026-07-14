import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { refreshInspirationFeed } from "@/lib/scraping/apify";

export async function POST() {
  await refreshInspirationFeed(true);
  revalidatePath("/inspiration");
  return NextResponse.redirect(new URL("/inspiration?refresh=1", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
}
