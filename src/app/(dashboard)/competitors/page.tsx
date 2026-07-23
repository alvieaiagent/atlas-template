import { ExternalLink } from "lucide-react";
import { UsageGuide } from "@/components/app/usage-guide";
import { SourceIcon } from "@/components/posts/source-icon";
import { removeCompetitorAction } from "@/lib/actions";
import { getCompetitors } from "@/lib/data";
import { getLanguage, pick } from "@/lib/language";
import { FALLBACK_WATCHLIST } from "@/lib/strategic-intelligence";
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

function ringClass(source: Source): string {
  if (source === "ig") return "bg-blue-600";
  if (source === "x") return "bg-slate-900";
  if (source === "threads") return "bg-slate-300";
  return "bg-slate-400";
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
      title: "People / Watchlist",
      intro: "Track creators, accounts, channels, websites, and sources that deserve conservative refreshes. Existing competitor rows are preserved below.",
      guideTitle: "Watchlist = priority sources Atlas should monitor without burning credits.",
      guideDescription: "This tab is not for stalking random creators. It is a strategic watchlist for AI, platform, creator, growth, partnership, and product signals.",
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
      title: "People / Watchlist",
      intro: "追蹤值得保守刷新嘅 creators、accounts、channels、websites、sources。原本 competitors rows 會保留喺下面。",
      guideTitle: "Watchlist = Atlas 應該監察但唔亂燒 credits 嘅 priority sources。",
      guideDescription: "呢個 tab 唔係用嚟 stalk random creators，而係 strategy watchlist：AI、platform、creator、growth、partnership、product signals。",
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
        <p className="text-sm text-slate-600">{copy.eyebrow}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">
          {copy.title}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
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

      <section className="rounded-xl border border-blue-100 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Priority watchlist shell</h2>
        <p className="mt-1 text-sm text-slate-600">
          Typed fallback/config only until a watchlist table is approved. Force refresh buttons show crawl scope instead of fake cost.
        </p>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {FALLBACK_WATCHLIST.map((item) => (
            <article key={item.name} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-950">{item.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.source} · {item.urlOrHandle}</p>
                </div>
                <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700">{item.priority}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.notes}</p>
              <dl className="mt-3 grid gap-2 text-xs text-slate-500">
                <div><dt className="font-bold text-slate-700">Learning area</dt><dd>{item.learningArea}</dd></div>
                <div><dt className="font-bold text-slate-700">Last / next refresh</dt><dd>{item.lastRefreshed} → {item.nextSuggestedRefresh}</dd></div>
              </dl>
              <button className="mt-3 min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700" type="button">
                Force refresh shell · scope first
              </button>
            </article>
          ))}
        </div>
      </section>

      {competitors.length ? (
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {competitors.map((competitor) => (
            <article
              key={`${competitor.source}-${competitor.handle}`}
              className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300"
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
                  <span className="flex h-full w-full items-center justify-center rounded-full bg-slate-50 text-base font-semibold text-slate-900">
                    {initialOf(competitor.name ?? competitor.handle)}
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-950 transition group-hover:text-blue-700">
                    <span className="truncate">
                      {competitor.name ?? competitor.handle}
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-600 transition group-hover:text-blue-700" />
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-600">
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
                  className="text-xs text-slate-600 transition hover:text-red-600"
                  title={copy.remove}
                >
                  {copy.remove}
                </button>
              </form>
            </article>
          ))}
        </section>
      ) : (
        <section className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
          {copy.empty}
        </section>
      )}
    </main>
  );
}
