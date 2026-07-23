import { ArrowRight, CalendarDays } from "lucide-react";
import Link from "next/link";
import { UsageGuide } from "@/components/app/usage-guide";
import { Button } from "@/components/ui/button";
import { getLanguage, pick } from "@/lib/language";
import { FALLBACK_DAILY_SUMMARIES, LEARNING_AREAS } from "@/lib/strategic-intelligence";

export default async function LearningsPage() {
  const language = await getLanguage();
  const copy = pick(language, {
    en: {
      eyebrow: "Daily Learnings",
      title: "Janice Executive Summary Hub",
      intro: "One place to review daily/weekly strategic learning. Each lane turns crawled or captured sources into implications for Alvie instead of a generic reading list.",
      date: "Date",
      guideTitle: "How to use Daily Learnings",
      guide: "Pick a lane, read Janice's short summary, then decide whether to save, use, build POV, watch later, or ignore. The point is fewer tabs open and clearer decisions.",
      steps: ["Choose area", "Read Janice", "Act"],
      bodies: ["Start with the learning lane closest to the decision Alvie is making today.", "Use Executive Summary, Flags, and Implication for Alvie; skip noisy entries fast.", "Save to Knowledge Bank, use for a work/business/CityU angle, or mark Ignore / Noise."],
      tip: "Fallback/sample cards below are structure previews only until daily_summaries exists or real generated entries are saved.",
      shell: "Janice Executive Summary shell",
      status: "Current status: no live daily_summaries query is wired in this pass. Atlas is ready to render the structure without pretending sample content is real.",
      open: "Open lane",
      past: "Past days / archive: older summaries should appear in Archive once persisted.",
      archive: "Open Archive",
    },
    yue: {
      eyebrow: "每日學習",
      title: "Janice Executive Summary Hub",
      intro: "集中睇每日 / 每週 strategic learning。每條 lane 都係將 crawled/captured sources 變成 Alvie implication，而唔係普通 reading list。",
      date: "日期",
      guideTitle: "每日學習點用",
      guide: "揀一條 lane，睇 Janice 短 summary，再決定 save、use、build POV、watch later 或 ignore。重點係少開 tabs，多做決定。",
      steps: ["揀 area", "睇 Janice", "行動"],
      bodies: ["由最貼近 Alvie 今日決策嘅 learning lane 開始。", "睇 Executive Summary、Flags、Implication for Alvie；嘈音快啲跳過。", "儲入 Knowledge Bank，用喺 career/business/CityU angle，或者標 Ignore / Noise。"],
      tip: "下面 fallback/sample cards 只係結構 preview；要等 daily_summaries 或真 generated entries 先係 real data。",
      shell: "Janice Executive Summary shell",
      status: "Current status：今個 pass 未 wire live daily_summaries query。Atlas 可以 render 結構，但唔會扮 sample content 係真。",
      open: "打開 lane",
      past: "過去日子 / archive：persisted 後，舊 summaries 應該出現喺 Archive。",
      archive: "打開 Archive",
    },
  });

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-bold text-blue-700">{copy.eyebrow}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{copy.title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600"><strong className="text-slate-950">{copy.intro.split(".")[0]}.</strong>{copy.intro.slice(copy.intro.indexOf(".") + 1)}</p>
        </div>
        <label className="flex min-w-48 flex-col gap-1 text-sm font-bold text-slate-700">{copy.date}<input type="date" className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950" /></label>
      </header>
      <UsageGuide title={copy.guideTitle} description={copy.guide} steps={copy.steps.map((title, index) => ({ label: String(index + 1), title, body: copy.bodies[index] }))} tip={copy.tip} />
      <section className="rounded-xl border border-blue-100 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-blue-700"><CalendarDays className="h-4 w-4" /><h2 className="text-lg font-bold text-slate-950">{copy.shell}</h2></div><p className="mt-2 text-sm leading-6 text-slate-600"><strong className="text-slate-950">{copy.status.split(":")[0]}:</strong>{copy.status.slice(copy.status.indexOf(":") + 1)}</p></section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{LEARNING_AREAS.map((area) => { const summary = FALLBACK_DAILY_SUMMARIES.find((item) => item.learningArea === area.label); return <Link key={area.slug} href={`/learnings/${area.slug}`} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">{summary?.dateHkt}</p><h2 className="mt-2 text-lg font-bold text-slate-950">{area.label}</h2></div><span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700">Fallback</span></div><p className="mt-3 text-sm leading-6 text-slate-600">{summary?.executiveSummary}</p><div className="mt-4 flex items-center gap-2 text-sm font-bold text-blue-700">{copy.open} <ArrowRight className="h-4 w-4" /></div></Link>; })}</section>
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-600"><strong className="text-slate-950">{copy.past.split(":")[0]}:</strong>{copy.past.slice(copy.past.indexOf(":") + 1)}</p><Button asChild variant="outline"><Link href="/archive">{copy.archive}</Link></Button></section>
    </main>
  );
}
