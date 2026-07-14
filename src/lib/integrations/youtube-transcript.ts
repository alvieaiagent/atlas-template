import { geminiGenerateText } from "@/lib/integrations/gemini";

// Pull a YouTube video's content as a dense 繁體中文 notes blob by feeding the public
// URL straight to Gemini (file_data.file_uri) — no fragile caption scraping. Returns
// { ok: false } on failure so callers fall back to the title.

export function extractYouTubeId(rawUrl: string | null): string | null {
  if (!rawUrl) return null;
  try {
    const u = new URL(rawUrl);
    if (u.hostname === "youtu.be") {
      return u.pathname.slice(1) || null;
    }
    if (u.pathname.startsWith("/shorts/")) {
      return u.pathname.split("/")[2] || null;
    }
    return u.searchParams.get("v");
  } catch {
    return null;
  }
}

export type TranscriptResult =
  | { ok: true; transcript: string }
  | { ok: false; error: string };

const MAX_TRANSCRIPT_CHARS = 12_000;

const NOTE_PROMPT =
  "請睇晒呢條 YouTube 片,用繁體中文抽成詳細重點筆記:涵蓋主要論點、步驟/方法、關鍵例子、數據同結論,保留資訊密度,唔好寫客套或者『呢條片講...』。只輸出筆記內容。";

/** Gemini watches the public YouTube URL and returns dense notes (used as the transcript). */
export async function fetchYouTubeTranscript(
  apiKey: string,
  url: string,
): Promise<TranscriptResult> {
  const id = extractYouTubeId(url);
  if (!id) {
    return { ok: false, error: "唔係有效 YouTube URL" };
  }

  const result = await geminiGenerateText(
    apiKey,
    [
      { file_data: { file_uri: `https://www.youtube.com/watch?v=${id}` } },
      { text: NOTE_PROMPT },
    ],
    {
      temperature: 0.3,
      maxOutputTokens: 4096,
      thinkingConfig: { thinkingBudget: 0 },
      // LOW media resolution: Gemini samples video frames at ~1/4 the tokens. A 40-min
      // talk drops from ~700k→~244k prompt tokens and finishes in ~53s instead of
      // blowing past the 60s serverless cap (Library page maxDuration=60). Audio (the
      // part that matters for notes) is unaffected; only frame detail is reduced.
      mediaResolution: "MEDIA_RESOLUTION_LOW",
    },
  );

  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  const transcript = result.text.trim();
  if (!transcript) {
    return { ok: false, error: "Gemini 冇返回筆記" };
  }
  return { ok: true, transcript: transcript.slice(0, MAX_TRANSCRIPT_CHARS) };
}
