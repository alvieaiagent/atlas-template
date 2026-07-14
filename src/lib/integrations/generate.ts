import { geminiGenerateText } from "@/lib/integrations/gemini";
import type { Purpose } from "@/lib/types";

// Output kinds = post purposes + extra social formats that aren't a post's
// classification (e.g. "thread" for the Twitter→Thread column). `post_outputs.kind`
// is free-text, so these need no DB migration.
export type OutputKind = Purpose | "thread";

export type GenerateInput = {
  caption: string;
  transcript: string | null;
  authorName: string;
  source: string;
};

export type GenerateResult =
  | { ok: true; content: string }
  | { ok: false; error: string };

function material(input: GenerateInput): string {
  return [
    `【來源】${input.source.toUpperCase()} · ${input.authorName}`,
    `【原帖 caption】\n${input.caption || "(無)"}`,
    `【影片逐字稿】\n${input.transcript ?? "(無 / 唔係影片)"}`,
  ].join("\n\n");
}

function buildPrompt(kind: OutputKind, input: GenerateInput): string | null {
  const src = material(input);

  switch (kind) {
    case "reel":
      return `你係一個 Reel 腳本創作助手。根據下面素材,寫一條 25-35 秒(約 100-175 中文字)、地道香港廣東話嘅 IG Reel 腳本,用「九連句懸念 Hook」結構:
句1 瞬間衝擊＋時事炸彈;句2 擴張影響層面;句3 低門檻承諾;句4 痛點共鳴;句5 衝擊數字/規模;句6 揭曉主角(中途先揭名,前 5 句唔好爆主角/工具名);句7 重新定義價值;句8 情感細節;句9 CTA(留言關鍵字 ＋ 你嘅 IG handle)。
規則:每 2 句最少一個情緒字眼(恐懼/興奮/解脫/稀缺/衝擊/情感/共鳴),類型要交替;每句一行;唔好書面語、唔好普通話詞。
輸出依次:1) 逐句策略拆解 2) 完整影片稿(每句一行,句6 前標「(停頓0.5秒)」) 3) 情緒字眼標注 4) 導演備注。

素材:
${src}`;

    case "swipe":
      return `你係文案拆解助手。將下面帖文拆解成一份可重用嘅 copywriting swipe-file 筆記,方便之後寫 Threads / IG caption / carousel 套格式。用繁體中文,精簡 bullet:
1) Hook 公式(第一句點樣 grab attention)
2) 整體結構 / 段落節奏
3) 用咗咩情緒 / 心理觸發點
4) CTA 寫法
5) 一句總結:呢個 post 點解 work,可以點偷師。

素材:
${src}`;

    case "research":
      return `你係學習研究助手。將下面內容整理成一份 Obsidian 學習筆記,用繁體中文 markdown,開頭加 YAML frontmatter(date / type: 學習筆記 / tags)。內容:
1) 一句總結
2) 內容結構拆解
3) 關鍵概念(用 [[雙括號]] link 重要 AI 工具 / 公司 / 概念)
4) Key takeaways(中英對照)
5) 對現有 workflow 嘅啟示(已有 / 未有 / 可以點用)。

素材:
${src}`;

    case "carousel":
      return `你係 prompt 工程師。根據下面素材,寫一份**完整、詳細、ready-to-paste 嘅 meta-prompt**,俾用戶 copy 去俾 Claude Code,等佢唔使再問、直接照住整一個 10 頁 IG carousel。要好似一份完整 brief 咁齊,具體唔好空泛。個 meta-prompt 必須包含晒:

1. 【任務】整 10 頁 IG carousel;【主題】(從逐字稿/素材嘅實際內容抽,要**具體**,唔好寫『AI』咁空泛);【目標受眾】香港 AI 內容創作者 / 一人公司;【痛點】(從素材抽)
注意:如果 caption 只係 CTA(例如「留言攞 link」),就以逐字稿嘅實際內容做主軸,唔好憑空作。
2. 【角度 / Reframe】70/30 — 70% 原 post 核心訊息,30% 你嘅獨家見解(香港 AI 創作者 / 一人公司角度),唔好照抄原文
3. 【逐頁大綱 P1-P10】每頁畀:標題(≤12字,爆點) / supporting line(≤25字) / 圖像方向。P1 封面 = typographic hook(字主導,唔好大 AI 圖)。建議結構:P1 封面 / P2 痛點 / P3-P7 核心方法每頁一個 point / P8 對比 before-after / P9 路線圖總結 / P10 CTA(留言關鍵字 + 你嘅 IG handle)
4. 【硬規則】書面中文(唔好口語);teachable(觀眾睇完唔使 lead magnet 都做到);每頁 minimalist — hero image 佔 60-70% 高 + 1 句 punchy headline + 1 句 supporting,唔好堆 4-bullet;至少 3-4 張 AI 生成嘅真 hero image(純 HTML mockup 唔算 mixed media)
5. 【交付物】HTML + 10 張 PNG(1080x1350) + caption.txt
6. 【caption 方向】(一句)

只輸出嗰份 meta-prompt 本身(由「Claude Code 你好」開始),完整到 Claude Code 一睇就做到。

素材:
${src}`;

    case "cheatsheet":
      return `你係 prompt 工程師。根據下面素材,寫一份完整、ready-to-paste 嘅 meta-prompt,俾用戶 copy 去俾 Claude Code,直接整一張「一頁攻略圖」(one-page infographic / cheatsheet)。要具體,唔好空泛。個 meta-prompt 必須包含晒:

1. 【任務】整一張一頁式攻略圖;【主題】(由逐字稿/素材實際內容抽,要**具體**,唔好寫『AI』咁空泛);【受眾】香港 AI 內容創作者 / 一人公司;【痛點】(由素材抽)
注意:caption 若只係 CTA(例如「留言攞 link」),以逐字稿實際內容做主軸,唔好憑空作。
2. 【風格】2 揀 1 並指明:① 教學型 = friendly tutorial(淺色、清晰步驟感);② FOMO 型 = cyberpunk 深藍底 + neon cyan 邊框。按主題揀啱嗰個。
3. 【版面】2×5 grid(共 10 格):每格 = 重點標題(≤8字)+ 一句描述(≤12字,香港人角度、有 FOMO,唔好台灣腔);頂部一個大標題(FOMO hook);底部 CTA + 你嘅 IG handle
4. 【內容】由素材抽 10 個 actionable points 填入 10 格,順序由淺入深
5. 【出圖】用 Gemini 3 Pro / Imagen 4 出圖最穩;若要可點擊版本,出 clickable HTML deploy 上 Cloudflare Pages
6. 【交付】一張 PNG(4:5 直度或方形)+(可選)HTML

只輸出嗰份 meta-prompt 本身(由「Claude Code 你好」開始),完整到 Claude Code 一睇就做到。

素材:
${src}`;

    case "thread":
      return `你係一個 Threads 文案手。根據下面素材,用**地道香港廣東話**寫一條可以直接出街嘅 Threads 帖(AI 工具/新聞快訊風格),食「最新」流量。

7-beat 結構:① 痛點/反差 Hook(第一句就要爆,**唔好一開波就出工具名**)② 揭工具名 + 一句講佢做乜 ③ 衝擊賣點(數字/排名/對比 — 只用素材有嘅,唔好作)④ 差異化/殺手 feature ⑤ 時事 context(點解而家啱時機)⑥ 你嘅導師視角一句 ⑦ 尾句二選一問題 + 👇 逼留言。

規則:90-220 中文字;唔好書面語、唔好普通話詞、唔好台灣腔(「有夠」「誠意滿滿」= ❌);唔好作數據;唔好寫 source attribution(唔好「Source: @xxx」)。

輸出依次:
1) 完整 paste-ready 帖文(直接可貼)
2) 建議 3-5 個 hashtag
3) 一句配圖 / 配片建議。

素材:
${src}`;

    case "business":
    case "inbox":
      return null;
  }
}

/** Generate the per-purpose text artifact via Gemini. */
export async function generateForPurpose(
  apiKey: string,
  kind: OutputKind,
  input: GenerateInput,
): Promise<GenerateResult> {
  const prompt = buildPrompt(kind, input);
  if (!prompt) {
    return {
      ok: false,
      error:
        kind === "inbox"
          ? "待發掘 — 揀返一個用途先生成。"
          : "商業角度暫時交俾 Small B / Derek,未有 in-app 生成。",
    };
  }

  const result = await geminiGenerateText(apiKey, [{ text: prompt }], {
    temperature: 0.7,
    maxOutputTokens: 2048,
    // gemini-2.5-flash is a thinking model; without this the hidden thinking tokens
    // eat the output budget and truncate the post mid-sentence. (Same fix as picks.ts.)
    thinkingConfig: { thinkingBudget: 0 },
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true, content: result.text };
}
