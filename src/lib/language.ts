import { cookies } from "next/headers";

export type Language = "en" | "yue";

export async function getLanguage(): Promise<Language> {
  const cookieStore = await cookies();
  return cookieStore.get("atlas-language")?.value === "yue" ? "yue" : "en";
}

export function pick<T>(language: Language, copy: { en: T; yue: T }): T {
  return copy[language];
}
