import { ExternalLink, Eye, Plus } from "lucide-react";
import { UsageGuide } from "@/components/app/usage-guide";
import { SourceIcon } from "@/components/posts/source-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addCompetitorAction, removeCompetitorAction } from "@/lib/actions";
import { getCompetitors } from "@/lib/data";
import { getLanguage, pick } from "@/lib/language";
import { FALLBACK_WATCHLIST, LEARNING_AREAS, WATCHLIST_PRIORITIES } from "@/lib/strategic-intelligence";
import type { Source } from "@/lib/types";

const WATCHLIST_SOURCES: { value: Source; label: string; hint: string }[] = [
  { value: "youtube", label: "YouTube", hint: "@channel or channel URL" },
  { value: "threads", label: "Threads", hint: "@username or threads.net link" },
  { value: "ig", label: "Instagram", hint: "@username or instagram.com link" },
  { value: "x", label: "X", hint: "@username or x.com link" },
];

function profileUrl(source: Source, handle: string): string {
  const clean = handle.replace(/^@/, "");
  if (source === "ig") return `https://www.instagram.com/${clean}/`;
  if (source === "threads") return `https://www.threads.net/@${clean}`;
  if (source === "youtube") return `https://www.youtube.com/@${clean}`;
  if (source === "facebook") return `https://www.facebook.com/${clean}`;
  return `https://x.com/${clean}`;
}

function ringClass(source: Source): string {
  if (source === "youtube") return "bg-red-600";
  if (source === "ig") return "bg-blue-600";
  if (source === "x") return "bg-slate-900";
  if (source === "threads") return "bg-slate-300";
  return "bg-slate-400";
}

function initialOf(value: string): string { return (value.trim().replace(/^@/, "")[0] ?? "?").toUpperCase(); }

export default async function CompetitorsPage() {
  const language = await getLanguage();
  const copy = pick(language, {
    en: {
      eyebrow: "Accounts to watch",
      title: "People / Watchlist",
      intro: "Paste YouTube, Threads, Instagram, or X accounts here so Atlas knows what to watch conservatively. Existing competitor rows are preserved below.",
      guideTitle: "Watchlist = priority sources Atlas should monitor without burning credits.",
      guideDescription: "This tab is not for stalking random creators. It is a strategic watchlist for AI, platform, creator, growth, partnership, and product signals.",
      addTitle: "Paste account once",
      addBody: "Choose a platform, paste the username or link, and Atlas will save the account when Supabase is enabled.",
      auditTitle: "Compare patterns, not ego",
      auditBody: "Look for recurring hooks, topic pillars, formats, CTAs, and what their audience rewards.",
      removeTitle: "Keep the list sharp",
      removeBody: "Remove accounts that no longer teach you anything. A tight watchlist beats a noisy competitor folder.",
      tip: "Best use: pick 5–10 accounts max per niche. P0 gets weekly manual/cron review later; everything else stays conservative.",
      pasteBoxTitle: "Add account to watch",
      platform: "Platform",
      input: "Username or link",
      name: "Optional display name",
      add: "Add to Watchlist",
      note: "Phase 1 saves to the existing competitors table when Supabase is configured. If Supabase is disabled, this form is UI-ready but will not persist yet.",
      openTitle: "Open profile",
      saved: "saved posts",
      remove: "Remove",
      empty: "No persisted watchlist accounts yet. Use the form above or press + on a card.",
    },
    yue: {
      eyebrow: "要觀察嘅 accounts",
      title: "People / Watchlist",
      intro: "喺度貼 YouTube、Threads、Instagram 或 X accounts，Atlas 之後就知要保守觀察邊啲 source。原本 competitors rows 會保留喺下面。",
      guideTitle: "Watchlist = Atlas 應該監察但唔亂燒 credits 嘅 priority sources。",
      guideDescription: "呢個 tab 唔係用嚟 stalk random creators，而係 strategy watchlist：AI、platform、creator、growth、partnership、product signals。",
      addTitle: "貼一次 account",
      addBody: "揀 platform，貼 username 或 link；Supabase 啟用時 Atlas 會儲低呢個 account。",
      auditTitle: "比 patterns，唔係比 ego",
      auditBody: "睇佢哋重複用咩 hooks、topic pillars、formats、CTAs，同 audience reward 咩。",
      removeTitle: "保持 list 夠 sharp",
      removeBody: "唔再教到你嘢嘅 account 就移除。細而準嘅 watchlist，好過嘈雜 competitor folder。",
      tip: "最佳用法：每個 niche 最多 5–10 個 accounts。P0 之後先做 weekly manual/cron review；其他保持 conservative。",
      pasteBoxTitle: "加入要觀察嘅 account",
      platform: "平台",
      input: "Username 或 link",
      name: "Optional 顯示名稱",
      add: "加入 Watchlist",
      note: "Phase 1 會喺 Supabase configured 時儲入 existing competitors table。Supabase disabled 時，呢個 form 係 UI-ready，但暫時唔會 persist。",
      openTitle: "打開 profile",
      saved: "條已存",
      remove: "移除",
      empty: "暫時未有 persisted watchlist accounts。用上面 form，或者喺 card 撳 + 加入。",
    },
  });
  const competitors = await getCompetitors();

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
      <header><p className="text-sm text-slate-600">{copy.eyebrow}</p><h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">{copy.title}</h1><p className="mt-1 text-sm text-slate-600">{copy.intro}</p></header>
      <UsageGuide title={copy.guideTitle} description={copy.guideDescription} steps={[{ label: "Add", title: copy.addTitle, body: copy.addBody }, { label: "Audit", title: copy.auditTitle, body: copy.auditBody }, { label: "Remove", title: copy.removeTitle, body: copy.removeBody }]} tip={copy.tip} />

      <section className="rounded-xl border border-blue-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-blue-700"><Eye className="h-4 w-4" /><h2 className="text-lg font-bold text-slate-950">{copy.pasteBoxTitle}</h2></div>
        <form action={addCompetitorAction} className="grid gap-3 lg:grid-cols-[180px_1fr_1fr_150px]">
          <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{copy.platform}<select name="source" className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-bold normal-case tracking-normal text-slate-950">{WATCHLIST_SOURCES.map((source) => <option key={source.value} value={source.value}>{source.label}</option>)}</select></label>
          <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{copy.input}<Input name="handle" placeholder="@mkbhd or https://youtube.com/@mkbhd" required /></label>
          <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{copy.name}<Input name="name" placeholder="MKBHD / Lenny / Runway" /></label>
          <Button type="submit" className="self-end"><Plus className="h-4 w-4" />{copy.add}</Button>
        </form>
        <p className="mt-3 text-xs leading-5 text-slate-500">{copy.note}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">{WATCHLIST_SOURCES.map((source) => <span key={source.value} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1"><strong className="text-slate-700">{source.label}:</strong> {source.hint}</span>)}</div>
      </section>

      <section className="rounded-xl border border-blue-100 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">Priority watchlist shell</h2>
        <p className="mt-1 text-sm text-slate-600">Typed fallback/config until fuller watchlist priority fields are approved. Force refresh buttons show crawl scope instead of fake cost.</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">{FALLBACK_WATCHLIST.map((item) => <article key={item.name} className="rounded-lg border border-slate-200 bg-slate-50 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-slate-950">{item.name}</p><p className="mt-1 text-xs text-slate-500">{item.source} · {item.urlOrHandle}</p></div><span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700">{item.priority}</span></div><p className="mt-3 text-sm leading-6 text-slate-600">{item.notes}</p><dl className="mt-3 grid gap-2 text-xs text-slate-500"><div><dt className="font-bold text-slate-700">Learning area</dt><dd>{item.learningArea}</dd></div><div><dt className="font-bold text-slate-700">Last / next refresh</dt><dd>{item.lastRefreshed} → {item.nextSuggestedRefresh}</dd></div></dl><button className="mt-3 min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700" type="button">Force refresh shell · scope first</button></article>)}</div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap gap-2">{WATCHLIST_PRIORITIES.map((priority) => <span key={priority} className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{priority}</span>)}{LEARNING_AREAS.map((area) => <span key={area.slug} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">{area.label}</span>)}</div>
        {competitors.length ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{competitors.map((competitor) => <article key={`${competitor.source}-${competitor.handle}`} className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300"><a href={profileUrl(competitor.source, competitor.handle)} target="_blank" rel="noopener noreferrer" className="flex min-w-0 flex-1 items-center gap-3" title={copy.openTitle}><span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full p-[2px] ${ringClass(competitor.source)}`}><span className="flex h-full w-full items-center justify-center rounded-full bg-slate-50 text-base font-semibold text-slate-900">{initialOf(competitor.name ?? competitor.handle)}</span></span><span className="min-w-0"><span className="flex items-center gap-1.5 text-sm font-semibold text-slate-950 transition group-hover:text-blue-700"><span className="truncate">{competitor.name ?? competitor.handle}</span><ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-600 transition group-hover:text-blue-700" /></span><span className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-600"><SourceIcon source={competitor.source} className="h-3 w-3 shrink-0" /><span className="truncate">@{competitor.handle} · {competitor.postCount} {copy.saved}</span></span></span></a><form action={removeCompetitorAction}><input type="hidden" name="source" value={competitor.source} /><input type="hidden" name="handle" value={competitor.handle} /><button type="submit" className="text-xs text-slate-600 transition hover:text-red-600" title={copy.remove}>{copy.remove}</button></form></article>)}</div> : <section className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">{copy.empty}</section>}
      </section>
    </main>
  );
}
