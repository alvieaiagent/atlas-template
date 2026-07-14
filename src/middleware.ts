import { NextResponse, type NextRequest } from "next/server";

// Single shared-password gate for the deployed app. On localhost (ATLAS_PASSWORD unset)
// the app stays open for convenience; on Vercel set ATLAS_PASSWORD to make it private.
// Auth is cookie-based (set by the /login form) so there is no repeated browser popup.
// NOTE: must live in src/ (this project uses a src/ directory) or Next won't run it.
const COOKIE_NAME = "atlas_auth";
// /capture is token-gated by the route itself (iOS share shortcut) and /api/cron
// is CRON_SECRET-gated by the route — both must bypass the login-cookie gate.
const PUBLIC_PATHS = ["/login", "/auth", "/capture", "/api/cron"];

export function middleware(request: NextRequest) {
  const password = process.env.ATLAS_PASSWORD;
  if (!password) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  ) {
    return NextResponse.next();
  }

  if (request.cookies.get(COOKIE_NAME)?.value === password) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
