import type { ReactNode } from "react";
import { ArrowRight, BookOpen, Database, RefreshCw, Save, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { LinkPasteBox } from "@/components/posts/link-paste-box";
import { Button } from "@/components/ui/button";
import { getPosts } from "@/lib/data";
import { getServerEnv } from "@/lib/env";
import { getLanguage, pick } from "@/lib/language";
import { FALLBACK_WATCHLIST, LEARNING_AREAS } from "@/lib/strategic-intelligence";

export async function TodayPageContent() {
  const language = await getLanguage();
  const copy = pick(language, {
    en: {
      eyebrow: "Today · Strategic Intelligence System",
      title: "Atlas V2 for Alvie",
      introStrong: "Private Janice-powered briefing + Knowledge Bank.",
      intro: "Capture useful internet signals, summarize them honestly, and turn them into career, business, CityU, AI, content, and partnership POV.",
      viewBrief: "View Strategic Brief",
      saveBank: "Save to Knowledge Bank",
      briefKicker: "Today's Strategic Brief",
      briefTitle: "No fake briefing: use captured signals first.",
      briefBody: "Janice should only brief from real crawls, pasted links, or saved notes. If Gemini/Supabase data is missing, Atlas shows the shell and tells Alvie what is missing instead of inventing analysis.",
      captureTitle: "Paste link or raw note",
      captureBody: "YouTube, web, X, Threads, Instagram, Facebook, 小紅書, or raw notes. If API/transcript fails, Atlas saves what it can and shows honest status.",
      recent: "Recent High-Value Signals",
      flags: "Janice Flags",
      queue: "Worth Remembering Queue",
      budget: "Crawl Budget Snapshot",
      shortcuts: "Watchlist Refresh Shortcuts",
      lanes: "Learning lanes",
      empty: "No live recent signals returned. Use Quick Capture or Force Refresh Selected Watchlist.",
      force: "Force Refresh Selected Watchlist",
      flagItems: ["Do not read everything. Save only material with a clear Alvie implication.", "No daily auto crawl. It burns Apify credits before Alvie is publishing.", "Fallback labels matter. Sample cards are structure only, not intelligence."],
    },
    yue: {
      eyebrow: "今日 · Strategic Intelligence System",
      title: "Atlas V2 for Alvie",
      introStrong: "私人 Janice briefing + Knowledge Bank。",
      intro: "擷取有用 internet signals，老實 summary，轉成 Alvie career、business、CityU、AI、content、partnership POV。",
      viewBrief: "睇 Strategic Brief",
      saveBank: "儲入 Knowledge Bank",
      briefKicker: "今日 Strategic Brief",
      briefTitle: "唔會扮有 briefing：先用真 captured signals。",
      briefBody: "Janice 只應該用真 crawl、貼入 link、或者 saved notes 做 brief。Gemini/Supabase data 缺失時，Atlas 只顯示 shell 同缺口，唔會作 analysis。",
      captureTitle: "貼 link 或 raw note",
      captureBody: "YouTube、web、X、Threads、Instagram、Facebook、小紅書，或者 raw notes。API/transcript fail 就老實顯示 status，能儲幾多就儲幾多。",
      recent: "近期高價值 Signals",
      flags: "Janice Flags",
      queue: "值得記住 Queue",
      budget: "Crawl Budget Snapshot",
      shortcuts: "Watchlist Refresh Shortcuts",
      lanes: "Learning lanes",
      empty: "暫時冇 live recent signals。用 Quick Capture 或 Force Refresh Selected Watchlist。",
      force: "Force Refresh Selected Watchlist",
      flagItems: ["唔好讀晒所有嘢。只儲有明確 Alvie implication 嘅材料。", "唔開 daily auto crawl。Alvie 未公開 post 前會燒 Apify credits。", "Fallback label 要當真。Sample cards 只係結構，唔係情報。"],
    },
  });
  const env = getServerEnv();
  const posts = await getPosts({ time: "7d" });
  const highValueSignals = posts.slice(0, 6);
  const p0Scope = FALLBACK_WATCHLIST.filter((item) => item.priority === "P0 Weekly");

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-bold text-blue-700">{copy.eyebrow}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{copy.title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600"><strong className="text-slate-950">{copy.introStrong}</strong> {copy.intro}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild><Link href="/learnings">{copy.viewBrief} <BookOpen className="h-4 w-4" /></Link></Button>
          <Button asChild variant="outline"><Link href="/library">{copy.saveBank} <Save className="h-4 w-4" /></Link></Button>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-xl border border-blue-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">{copy.briefKicker}</p>
          <h2 className="mt-2 text-xl font-bold text-slate-950">{copy.briefTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{copy.briefBody}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Metric label="Active Signals" value={String(highValueSignals.length)} note="last 7 days query" />
            <Metric label="Learning Areas" value="6" note="AI, platform, creator, growth, partnership, product" />
            <Metric label="Budget Mode" value="Conservative" note="daily crawl disabled" />
          </div>
        </article>
        <article className="rounded-xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Quick Capture</p>
          <h2 className="mt-2 text-xl font-bold text-slate-950">{copy.captureTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{copy.captureBody}</p>
          <div className="mt-4"><LinkPasteBox /></div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Panel title={copy.recent} icon={<Database className="h-4 w-4" />}>
          {highValueSignals.length ? <div className="space-y-3">{highValueSignals.map((post) => <a key={post.id} href={post.url ?? "/inspiration"} target={post.url ? "_blank" : undefined} className="block rounded-lg border border-slate-200 bg-white p-3 hover:border-blue-200"><p className="line-clamp-2 text-sm font-bold text-slate-950">{post.text || post.authorName}</p><p className="mt-1 text-xs text-slate-500">{post.source.toUpperCase()} · {post.authorHandle || "unknown"}</p></a>)}</div> : <Empty text={copy.empty} />}
        </Panel>
        <Panel title={copy.flags} icon={<ShieldAlert className="h-4 w-4" />}><ul className="space-y-2 text-sm leading-6 text-slate-700">{copy.flagItems.map((item) => <li key={item}><strong className="text-slate-950">{item.split(". ")[0]}.</strong> {item.split(". ").slice(1).join(". ")}</li>)}</ul></Panel>
        <Panel title={copy.queue} icon={<Save className="h-4 w-4" />}><div className="flex flex-wrap gap-2">{["Use for Career", "Use for Business", "Use for CityU", "Use for AI", "Build POV", "Market Signal"].map((tag) => <span key={tag} className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{tag}</span>)}</div><p className="mt-3 text-sm text-slate-600">V2 metadata is typed, but DB columns are not migrated in this pass. Use Library purpose filters until worth_tags exists.</p></Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel title={copy.budget} icon={<RefreshCw className="h-4 w-4" />}><p className="text-sm leading-6 text-slate-600"><strong className="text-slate-950">Recommended:</strong> Friday 9:00am HKT weekly strategic brief (`0 1 * * 5` UTC) only after a safe authenticated cron endpoint exists.</p><div className="mt-3 grid gap-2 sm:grid-cols-2"><Metric label="Supabase" value={env.SUPABASE_URL ? "Configured" : "Missing"} note="current env check" /><Metric label="Apify" value={env.APIFY_TOKEN ? "Configured" : "Missing"} note="force refresh availability" /></div></Panel>
        <Panel title={copy.shortcuts} icon={<RefreshCw className="h-4 w-4" />}><div className="space-y-3">{p0Scope.map((item) => <div key={item.name} className="rounded-lg border border-slate-200 bg-white p-3"><p className="font-bold text-slate-950">{item.name}</p><p className="text-xs text-slate-500">Will crawl conservative scope only; exact cost unavailable, so Atlas shows scope not fake cost.</p></div>)}</div><Button className="mt-3" asChild variant="outline"><Link href="/competitors">{copy.force} <ArrowRight className="h-4 w-4" /></Link></Button></Panel>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-slate-950">{copy.lanes}</h2><div className="mt-3 grid gap-3 md:grid-cols-3">{LEARNING_AREAS.map((area) => <Link key={area.slug} href={`/learnings/${area.slug}`} className="rounded-lg border border-slate-200 p-3 text-sm font-bold text-blue-700 hover:border-blue-200 hover:bg-blue-50">{area.label}</Link>)}</div></section>
    </main>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 text-xl font-bold text-slate-950">{value}</p><p className="text-xs text-slate-500">{note}</p></div>;
}

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-3 flex items-center gap-2 text-blue-700">{icon}<h2 className="text-base font-bold text-slate-950">{title}</h2></div>{children}</section>;
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">{text}</p>;
}
