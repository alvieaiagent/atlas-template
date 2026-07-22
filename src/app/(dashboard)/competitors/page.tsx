import { ExternalLink } from "lucide-react";
import { UsageGuide } from "@/components/app/usage-guide";
import { SourceIcon } from "@/components/posts/source-icon";
import { removeCompetitorAction } from "@/lib/actions";
import { getCompetitors } from "@/lib/data";
import { getLanguage, pick } from "@/lib/language";
import type { Source } from "@/lib/types";

function profileUrl(source: Source, handle: string): string {
  if (source === "ig") {
    return `https://www.instagram.com/${handle}/`;
  }
  if (source === "threads") {
    return `https://www.threads.net/@${handle}`;
  }
  return `https://x.com/${handle}`;
}

// Instagram-style gradient ring per source, so a card reads like a 看板 avatar.
function ringClass(source: Source): string {
  if (source === "ig") {
    return "bg-gradient-to-tr from-amber-400 via-rose-500 to-fuchsia-600";
  }
  if (source === "x") {
    return "bg-sky-500";
  }
  if (source === "threads") {
    return "bg-zinc-200";
  }
  return "bg-zinc-600";
}

function initialOf(value: string): string {
  const char = value.trim().replace(/^@/, "")[0] ?? "?";
  return char.toUpperCase();
}

export default async function CompetitorsPage() {
  const language = await getLanguage();
  const copy = pick(language, {
    en: {
      eyebrow: "Accounts to watch",
      title: "Competitors",
      intro: "Press + beside the source on any card to track that account. This page shows every account you watch and how many saved posts you have from them.",
      guideTitle: "Competitors = accounts you want to learn from or beat.",
      guideDescription: "This tab is not for stalking random creators. It is a watchlist for accounts whose hooks, offers, formats, or audience reactions can improve your own content strategy.",
      addTitle: "Track from any post card",
      addBody: "Press the + beside a card's source badge when the creator repeatedly makes content worth studying.",
      auditTitle: "Compare patterns, not ego",
      auditBody: "Look for their recurring hooks, topic pillars, formats, CTAs, and what their audience rewards.",
      removeTitle: "Keep the list sharp",
      removeBody: "Remove accounts that no longer teach you anything. A tight watchlist beats a noisy competitor folder.",
      tip: "Best use: pick 5–10 accounts max per niche, then review what they do repeatedly that you can ethically adapt.",
      openTitle: "Open profile",
      saved: "saved posts",
      remove: "Remove",
      empty: "No competitors tracked yet. Press + on a card to add one.",
    },
    yue: {
      eyebrow: "要觀察嘅 accounts",
      title: "競爭對手",
      intro: "喺任何卡右上角 source 旁邊撳 + 就追蹤嗰個帳號；呢度睇晒你 watch 緊嘅對手，同已存咗幾多條佢哋嘅 post。",
      guideTitle: "競爭對手 = 你想學習或者打贏嘅 accounts。",
      guideDescription: "呢個 tab 唔係用嚟 stalk random creators，而係 watchlist：佢哋嘅 hooks、offers、formats、audience reactions 可以改善你自己嘅 content strategy。",
      addTitle: "由任何 post card 加入追蹤",
      addBody: "當一個 creator 重複出到值得研究嘅內容，就喺 card source badge 旁邊撳 +。",
      auditTitle: "比 patterns，唔係比 ego",
      auditBody: "睇佢哋重複用咩 hooks、topic pillars、formats、CTAs，同 audience reward 咩。",
      removeTitle: "保持 list 夠 sharp",
      removeBody: "唔再教到你嘢嘅 account 就移除。細而準嘅 watchlist，好過嘈雜 competitor folder。",
      tip: "最佳用法：每個 niche 最多揀 5–10 個 accounts，定期睇佢哋重複做啱咩，再 ethical adapt。",
      openTitle: "打開 profile",
      saved: "條已存",
      remove: "移除",
      empty: "仲未追蹤任何競爭對手。喺卡右上角撳 + 加入。",
    },
  });
  const competitors = await getCompetitors();

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
      <header>
        <p className="text-sm text-zinc-500">{copy.eyebrow}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-normal text-zinc-50">
          {copy.title}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {copy.intro}
        </p>
      </header>

      <UsageGuide
        title={copy.guideTitle}
        description={copy.guideDescription}
        steps={[
          {
            label: "Add",
            title: copy.addTitle,
            body: copy.addBody,
          },
          {
            label: "Audit",
            title: copy.auditTitle,
            body: copy.auditBody,
          },
          {
            label: "Remove",
            title: copy.removeTitle,
            body: copy.removeBody,
          },
        ]}
        tip={copy.tip}
      />

      {competitors.length ? (
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {competitors.map((competitor) => (
            <article
              key={`${competitor.source}-${competitor.handle}`}
              className="group flex items-center gap-3 rounded-xl border border-zinc-850 bg-zinc-900 p-4 transition hover:border-zinc-700"
            >
              <a
                href={profileUrl(competitor.source, competitor.handle)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-w-0 flex-1 items-center gap-3"
                title={copy.openTitle}
              >
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full p-[2px] ${ringClass(competitor.source)}`}
                >
                  <span className="flex h-full w-full items-center justify-center rounded-full bg-zinc-950 text-base font-semibold text-zinc-100">
                    {initialOf(competitor.name ?? competitor.handle)}
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-zinc-50 transition group-hover:text-sky-300">
                    <span className="truncate">
                      {competitor.name ?? competitor.handle}
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-zinc-500 transition group-hover:text-sky-300" />
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500">
                    <SourceIcon source={competitor.source} className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      @{competitor.handle} · {competitor.postCount} {copy.saved}
                    </span>
                  </span>
                </span>
              </a>
              <form action={removeCompetitorAction}>
                <input type="hidden" name="source" value={competitor.source} />
                <input type="hidden" name="handle" value={competitor.handle} />
                <button
                  type="submit"
                  className="text-xs text-zinc-500 transition hover:text-red-300"
                  title={copy.remove}
                >
                  {copy.remove}
                </button>
              </form>
            </article>
          ))}
        </section>
      ) : (
        <section className="rounded-lg border border-zinc-850 bg-zinc-900 p-8 text-center text-sm text-zinc-500">
          {copy.empty}
        </section>
      )}
    </main>
  );
}
