import { NextResponse, type NextRequest } from "next/server";
import type { Language } from "@/lib/language";

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  return value;
}

export async function GET(request: NextRequest) {
  const language: Language = request.nextUrl.searchParams.get("lang") === "yue" ? "yue" : "en";
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  const response = NextResponse.redirect(new URL(next, host ? `${proto}://${host}` : request.url));
  response.cookies.set("atlas-language", language, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return response;
}
