const GEMINI_MODEL = "gemini-2.5-flash";
const MAX_VIDEO_BYTES = 18 * 1024 * 1024; // inline request cap (~20MB total)

const TRANSCRIBE_PROMPT =
  "請將呢段影片入面所有人聲對白/旁白,逐字轉成文字稿。" +
  "如果原本係中文或廣東話,保留原文逐字;" +
  "如果係其他語言(例如韓文、英文、日文),就翻譯成繁體中文。" +
  "只輸出文字稿,唔好加時間碼、唔好加任何解釋。";

export type TranscribeResult =
  | { ok: true; transcript: string }
  | { ok: false; error: string };

function extractGeminiText(json: unknown): string | null {
  if (typeof json !== "object" || json === null) {
    return null;
  }
  const candidates = (json as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return null;
  }
  const parts = (candidates[0] as { content?: { parts?: unknown } })?.content
    ?.parts;
  if (!Array.isArray(parts)) {
    return null;
  }
  const text = parts
    .map((part) =>
      typeof (part as { text?: unknown }).text === "string"
        ? (part as { text: string }).text
        : "",
    )
    .join("");
  return text.trim() || null;
}

/** Download an IG/Threads/X video and transcribe its speech with Gemini. */
export async function transcribeVideo(
  apiKey: string,
  videoUrl: string,
): Promise<TranscribeResult> {
  let bytes: ArrayBuffer;
  try {
    const response = await fetch(videoUrl);
    if (!response.ok) {
      return {
        ok: false,
        error: `影片下載失敗 (${response.status}) — 連結可能已過期,請重新貼一次 link。`,
      };
    }
    bytes = await response.arrayBuffer();
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "影片下載失敗",
    };
  }

  if (bytes.byteLength > MAX_VIDEO_BYTES) {
    return { ok: false, error: "影片太大 (>18MB),暫未支援轉錄。" };
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: "video/mp4",
                    data: Buffer.from(bytes).toString("base64"),
                  },
                },
                { text: TRANSCRIBE_PROMPT },
              ],
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 200);
      return { ok: false, error: `Gemini ${response.status}: ${detail}` };
    }

    const transcript = extractGeminiText(await response.json());
    if (!transcript) {
      return { ok: false, error: "Gemini 冇返回逐字稿。" };
    }
    return { ok: true, transcript };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Gemini 轉錄失敗",
    };
  }
}
