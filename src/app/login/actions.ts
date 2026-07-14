"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "atlas_auth";

// Simple shared-password unlock: match ATLAS_PASSWORD, drop a long-lived httpOnly
// cookie, and bounce to the dashboard. The cookie is what middleware checks, so the
// browser never shows the native Basic-Auth popup again.
export async function unlockAction(formData: FormData) {
  const password = process.env.ATLAS_PASSWORD;
  const supplied = String(formData.get("password") ?? "");

  if (!password || supplied !== password) {
    redirect("/login?error=1");
  }

  const store = await cookies();
  store.set(COOKIE_NAME, password, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  redirect("/");
}
