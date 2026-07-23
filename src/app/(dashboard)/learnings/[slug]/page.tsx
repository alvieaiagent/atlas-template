import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getLanguage, pick } from "@/lib/language";
import { FALLBACK_DAILY_SUMMARIES, getLearningArea } from "@/lib/strategic-intelligence";

type LearningAreaPageProps = { params: Promise<{ slug: string }> };

export default async function LearningAreaPage({ params }: LearningAreaPageProps) {
  const { slug } = await params;
  const area = getLearningArea(slug);
  if (!area) notFound();
  const language = await getLanguage();
  const copy = pick(language, {
    en: { eyebrow: "Daily Learnings", title: "Janice summaries grouped by date", intro: "Use this lane when the question belongs here. Janice keeps it executive, implication-focused, and honest about weak/noisy signals.", back: "Back to hub", fallback: "Fallback/sample · not live data" },
    yue: { eyebrow: "每日學習", title: "按日期分組嘅 Janice summaries", intro: "當問題屬於呢條 lane，就用呢頁。Janice 保持 executive、implication-focused，並會老實講 weak/noisy signals。", back: "返去 hub", fallback: "Fallback/sample · not live data" },
  });
  const entries = FALLBACK_DAILY_SUMMARIES.filter((entry) => entry.learningArea === area.label);

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div><p className="text-sm font-bold text-blue-700">{copy.eyebrow} · {area.label}</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{copy.title}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600"><strong className="text-slate-950">{copy.intro.split(".")[0]}.</strong>{copy.intro.slice(copy.intro.indexOf(".") + 1)}</p></div>
        <Button asChild variant="outline"><Link href="/learnings">{copy.back}</Link></Button>
      </header>
      {entries.map((entry) => <article key={entry.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-bold text-slate-950">{entry.dateHkt}</h2>{entry.isFallback ? <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{copy.fallback}</span> : null}</div><JaniceSection title="Executive Summary"><p>{entry.executiveSummary}</p></JaniceSection><JaniceList title="Key Points" items={entry.keyPoints} /><JaniceList title="Highlights" items={entry.highlights} /><JaniceList title="Lowlights" items={entry.lowlights} /><JaniceList title="Flags" items={entry.flags} /><JaniceSection title="Implication for Alvie"><p>{entry.implicationForAlvie}</p></JaniceSection><JaniceSection title="Recommended Action"><span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">{entry.recommendedAction}</span></JaniceSection><JaniceList title="Sources Used" items={entry.sourcesUsed} /></article>)}
    </main>
  );
}

function JaniceSection({ title, children }: { title: string; children: ReactNode }) { return <section className="mt-5 border-t border-slate-100 pt-4"><h3 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500">{title}</h3><div className="mt-2 text-sm leading-6 text-slate-700">{children}</div></section>; }
function JaniceList({ title, items }: { title: string; items: string[] }) { return <JaniceSection title={title}><ul className="list-disc space-y-1 pl-5">{items.map((item) => <li key={item}>{item}</li>)}</ul></JaniceSection>; }
