import { ArrowRight, Bookmark, Clock, RefreshCw } from "lucide-react";
import Link from "next/link";
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
    </main>
  );
}
