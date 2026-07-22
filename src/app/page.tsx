import { ArrowRight, Bookmark, Clock, RefreshCw } from "lucide-react";
import Link from "next/link";
import { UsageGuide } from "@/components/app/usage-guide";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm text-zinc-500">Your private dashboard</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal text-zinc-50">
            Inspiration Dashboard
          </h1>
        </div>
        <Button asChild>
          <Link href="/inspiration">
            Open feed <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-zinc-850 bg-zinc-900 p-5">
          <Clock className="mb-4 h-5 w-5 text-sky-300" />
          <p className="text-2xl font-semibold">3h</p>
          <p className="mt-1 text-sm text-zinc-500">Scheduled refresh cadence</p>
        </div>
        <div className="rounded-lg border border-zinc-850 bg-zinc-900 p-5">
          <Bookmark className="mb-4 h-5 w-5 text-orange-300" />
          <p className="text-2xl font-semibold">Marked</p>
          <p className="mt-1 text-sm text-zinc-500">Save post ideas for review</p>
        </div>
        <div className="rounded-lg border border-zinc-850 bg-zinc-900 p-5">
          <RefreshCw className="mb-4 h-5 w-5 text-emerald-300" />
          <p className="text-2xl font-semibold">Apify</p>
          <p className="mt-1 text-sm text-zinc-500">X, Threads, and IG sources</p>
        </div>
      </div>

      <UsageGuide
        title="Start here: Atlas is a content operating system, not a bookmark folder."
        description="Use the dashboard as the front door. It tells you where to go depending on whether you are collecting fresh references, saving winners, or turning links into reusable content assets."
        steps={[
          {
            label: "1 · Scan",
            title: "Open Inspiration or AI Radar",
            body: "Use Inspiration for X / Threads / IG examples. Use AI Radar for fresh AI/tool updates that can become timely posts.",
          },
          {
            label: "2 · Decide",
            title: "Mark only useful patterns",
            body: "Do not save everything. Mark posts only when you can name the hook, angle, format, or visual pattern worth reusing.",
          },
          {
            label: "3 · Convert",
            title: "Move to Marked or Library",
            body: "Marked is your review queue. Library is your permanent vault for links, notes, scripts, swipe files, and generated artifacts.",
          },
        ]}
        tip={
          <>
            Best daily flow: 15 minutes scan → mark 3 good references → convert 1 into
            your own post idea before collecting more.
          </>
        }
      />
    </main>
  );
}
