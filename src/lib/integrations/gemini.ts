export const GEMINI_TEXT_MODEL = "gemini-2.5-flash";

type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } }
  // Gemini can ingest a public YouTube URL directly (no transcript scraping).
  | { file_data: { file_uri: string; mime_type?: string } };

export function extractGeminiText(json: unknown): string {
  if (typeof json !== "object" || json === null) {
    return "";
  }
  const candidates = (json as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return "";
  }
  const parts = (candidates[0] as { content?: { parts?: unknown } })?.content
    ?.parts;
  if (!Array.isArray(parts)) {
    return "";
  }
  return parts
    .map((part) =>
      typeof (part as { text?: unknown }).text === "string"
        ? (part as { text: string }).text
        : "",
    )
    .join("")
    .trim();
}

export type GeminiResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

/** One-shot Gemini text generation. Used by classify + per-purpose generate. */
export async function geminiGenerateText(
  apiKey: string,
  parts: GeminiPart[],
  config?: Record<string, unknown>,
): Promise<GeminiResult> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          ...(config ? { generationConfig: config } : {}),
        }),
      },
    );

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 200);
      return { ok: false, error: `Gemini ${response.status}: ${detail}` };
    }

    const text = extractGeminiText(await response.json());
    if (!text) {
      return { ok: false, error: "Gemini 冇返回內容。" };
    }
    return { ok: true, text };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Gemini 請求失敗",
    };
  }
}
