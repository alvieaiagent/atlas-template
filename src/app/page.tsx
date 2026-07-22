import { ArrowRight, Bookmark, Clock, RefreshCw } from "lucide-react";
import Link from "next/link";
import { UsageGuide } from "@/components/app/usage-guide";
import { Button } from "@/components/ui/button";
import { getLanguage, pick } from "@/lib/language";

export default async function Home() {
  const language = await getLanguage();
  const copy = pick(language, {
    en: {
      eyebrow: "Your private dashboard",
      title: "Inspiration Dashboard",
      open: "Open feed",
      cadence: "Scheduled refresh cadence",
      marked: "Save post ideas for review",
      sources: "X, Threads, and IG sources",
      guideTitle: "Start here: Atlas is a content operating system, not a bookmark folder.",
      guideDescription: "Use the dashboard as the front door. It tells you where to go depending on whether you are collecting fresh references, saving winners, or turning links into reusable content assets.",
      scanTitle: "Open Inspiration or AI Radar",
      scanBody: "Use Inspiration for X / Threads / IG examples. Use AI Radar for fresh AI/tool updates that can become timely posts.",
      decideTitle: "Mark only useful patterns",
      decideBody: "Do not save everything. Mark posts only when you can name the hook, angle, format, or visual pattern worth reusing.",
      convertTitle: "Move to Marked or Library",
      convertBody: "Marked is your review queue. Library is your permanent vault for links, notes, scripts, swipe files, and generated artifacts.",
      tip: "Best daily flow: 15 minutes scan → mark 3 good references → convert 1 into your own post idea before collecting more.",
    },
    yue: {
      eyebrow: "你嘅私人 dashboard",
      title: "靈感 Dashboard",
      open: "打開 Feed",
      cadence: "自動刷新頻率",
      marked: "儲起值得覆盤嘅 post ideas",
      sources: "X、Threads、IG 來源",
      guideTitle: "由呢度開始：Atlas 係內容操作系統，唔係 bookmark folder。",
      guideDescription: "Dashboard 係入口：你想掃新靈感、儲低高質素材、定將 link 變成可重用內容，都由呢度分流。",
      scanTitle: "打開 Inspiration 或 AI Radar",
      scanBody: "Inspiration 用嚟睇 X / Threads / IG 例子；AI Radar 用嚟搵最新 AI/tool 更新，適合快手變成 timely post。",
      decideTitle: "只 Mark 有用 pattern",
      decideBody: "唔好乜都儲。你講得出 hook、角度、格式、視覺 pattern 點樣翻用，先好 Mark。",
      convertTitle: "去 Marked 或 Library 轉化",
      convertBody: "Marked 係覆盤 queue；Library 係永久素材庫，放 links、notes、scripts、swipe files、generated artifacts。",
      tip: "每日最佳 flow：掃 15 分鐘 → Mark 3 個好 reference → 即日轉 1 個做自己嘅 post idea。",
    },
  });
  return (
    <main className="flex flex-1 flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm text-zinc-500">{copy.eyebrow}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-zinc-50">
            {copy.title}
          </h1>
        </div>
        <Button asChild>
          <Link href="/inspiration">
            {copy.open} <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-zinc-850 bg-zinc-900 p-5">
          <Clock className="mb-4 h-5 w-5 text-sky-300" />
          <p className="text-2xl font-semibold">3h</p>
          <p className="mt-1 text-sm text-zinc-500">{copy.cadence}</p>
        </div>
        <div className="rounded-lg border border-zinc-850 bg-zinc-900 p-5">
          <Bookmark className="mb-4 h-5 w-5 text-orange-300" />
          <p className="text-2xl font-semibold">Marked</p>
          <p className="mt-1 text-sm text-zinc-500">{copy.marked}</p>
        </div>
        <div className="rounded-lg border border-zinc-850 bg-zinc-900 p-5">
          <RefreshCw className="mb-4 h-5 w-5 text-emerald-300" />
          <p className="text-2xl font-semibold">Apify</p>
          <p className="mt-1 text-sm text-zinc-500">{copy.sources}</p>
        </div>
      </div>

      <UsageGuide
        title={copy.guideTitle}
        description={copy.guideDescription}
        steps={[
          {
            label: "1 · Scan",
            title: copy.scanTitle,
            body: copy.scanBody,
          },
          {
            label: "2 · Decide",
            title: copy.decideTitle,
            body: copy.decideBody,
          },
          {
            label: "3 · Convert",
            title: copy.convertTitle,
            body: copy.convertBody,
          },
        ]}
        tip={copy.tip}
      />
    </main>
  );
}
