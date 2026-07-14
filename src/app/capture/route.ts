import { NextResponse, type NextRequest } from "next/server";
import { captureLink } from "@/lib/actions";

// Apify resolve + Gemini classify can take a while.
export const maxDuration = 60;

// Token-gated capture endpoint for the iOS share shortcut:
//   /capture?k=<ATLAS_CAPTURE_TOKEN>&url=<post-url>
// It saves the link without needing the login cookie, then (re)sets that cookie
// and redirects to the library so viewing isn't gated afterwards.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const url = searchParams.get("url")?.trim() ?? "";
  const key = searchParams.get("k") ?? "";

  const token = process.env.ATLAS_CAPTURE_TOKEN;
  const password = process.env.ATLAS_PASSWORD;

  if (token && key !== token) {
    return new NextResponse("Unauthorized.", { status: 401 });
  }

  const dest = new URL("/library", origin);
  if (url) {
    const result = await captureLink(url);
    dest.searchParams.set("captured", result.ok ? "1" : "0");
  } else {
    // Shortcut sent no url (the variable chip was likely deleted while editing).
    dest.searchParams.set("captured", "empty");
  }

  const response = NextResponse.redirect(dest);
  if (password) {
    response.cookies.set("atlas_auth", password, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }
  return response;
}
