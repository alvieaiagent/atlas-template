import { geminiGenerateText } from "@/lib/integrations/gemini";
import { PURPOSES, type Purpose } from "@/lib/types";

const CLASSIFY_PROMPT = `你係內容分流助手。睇下面一段社交媒體帖文,判斷佢對一個香港 AI 內容創作者最啱嘅「用途」。只可以揀以下其中一個英文代號,淨係輸出代號本身,唔好任何其他字:

reel = 適合改寫成 25-35 秒短影片 / Reel(清晰 AI 新聞、工具更新、爆點、教學)
carousel = 適合做成 8-10 頁圖文 carousel(步驟、清單、框架、工具教學)
swipe = 主要學人哋嘅文案 hook / 結構 / 排版(copywriting 參考)
research = 資訊收集 / 學習研究(深度內容、長文、學完再轉化)
business = 商業 / offer / 賺錢角度(定價、創業、變現、一人公司)
inbox = 唔清楚 / 純收藏 / 待判斷

帖文:
"""
{TEXT}
"""

只輸出一個代號:`;

/** Ask Gemini which content purpose a post best fits. Defaults to inbox on any failure. */
export async function classifyPurpose(
  apiKey: string,
  text: string,
): Promise<Purpose> {
  const trimmed = text.trim();
  if (!trimmed) {
    return "inbox";
  }

  const result = await geminiGenerateText(
    apiKey,
    [{ text: CLASSIFY_PROMPT.replace("{TEXT}", trimmed.slice(0, 1500)) }],
    { temperature: 0, maxOutputTokens: 10 },
  );

  if (!result.ok) {
    return "inbox";
  }

  const out = result.text.toLowerCase();
  const match = PURPOSES.map((purpose) => purpose.value).find((value) =>
    out.includes(value),
  );
  return match ?? "inbox";
}
