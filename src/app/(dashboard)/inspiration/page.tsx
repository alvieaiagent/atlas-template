import { getJaniceSummaries } from "@/lib/janice-summary";
import { Grid2X2, List, RefreshCw } from "lucide-react";
import Link from "next/link";
import { FilterLink } from "@/components/app/filter-link";
import { UsageGuide } from "@/components/app/usage-guide";
import { PostCard } from "@/components/posts/post-card";
import { SourceIcon } from "@/components/posts/source-icon";
import { Button } from "@/components/ui/button";
import {
  competitorKey,
  getCategories,
  getCompetitorKeySet,
  getPosts,
} from "@/lib/data";
import {
  buildHref,
  parseSources,
  parseTime,
  parseView,
  toggleSource,
  type InspirationSearchParams,
} from "@/lib/search-params";
import { SOURCES, TIME_FILTERS } from "@/lib/types";
import { getLanguage, pick } from "@/lib/language";
import { cn } from "@/lib/utils";

type InspirationPageProps = {
  searchParams: Promise<InspirationSearchParams>;
};

export default async function InspirationPage({
  searchParams,
}: InspirationPageProps) {
  const params = await searchParams;
  const language = await getLanguage();
  const copy = pick(language, {
    en: {
      eyebrow: "Active Signals · last 90 days by default",
      title: "Signals",
      refresh: "Force refresh",
      guideTitle: "Signals = recent crawled/captured material Janice can triage.",
      guideDescription:
        "This tab is for scanning fresh X, Threads, IG Reels, and manual-capture sources. The job is not to read everything; the job is to spot implications worth saving into Knowledge Bank.",
      xTitle: "Sharp takes & thread logic",
      xBody: "Use X to study first-line hooks, contrarian angles, argument flow, and thread structures for thought leadership posts.",
      threadsTitle: "Human voice & relatability",
      threadsBody: "Use Threads to study casual phrasing, confession-style openings, community prompts, and daily presence content.",
      reelsTitle: "Video hook & visual rhythm",
      reelsBody: "Use IG Reels to study the first 3 seconds, on-screen text, camera pattern, edit pacing, caption, and save/share triggers.",
      tip: "Before saving, ask: “Does this help Alvie’s career, business, CityU, AI usage, content creation, or partnerships?” If no, treat it as noise.",
      emptyTitle: "No posts match these filters yet.",
      emptyBody:
        "This usually means the filter is too narrow, the refresh has not found anything useful, or the source/category settings need tuning. Do not treat an empty feed as failure — use it to tighten the search.",
      emptyActions: [
        "Switch to All time / All sources to check whether posts exist.",
        "Press Force refresh if you want Atlas to fetch fresh references now.",
        "Go to Settings if the same category stays empty after refresh.",
      ],
      resetFilters: "Reset to broad feed",
      openSettings: "Tune Settings",
      refreshed: (count: string, errors: string | undefined) =>
        errors
          ? `Refresh finished: ${count} posts saved, ${errors} source runs had errors. Try a narrower source/category or check Apify actor logs.`
          : `Refresh finished: ${count} posts saved.`,
    },
    yue: {
      eyebrow: "Active Signals · 預設睇最近 90 日",
      title: "Signals",
      refresh: "即刻刷新",
      guideTitle: "Signals = 近期 crawled/captured 材料，俾 Janice triage。",
      guideDescription:
        "呢個 tab 用嚟掃 X、Threads、IG Reels 同 manual-capture sources。重點唔係讀晒所有嘢，而係搵值得入 Knowledge Bank 嘅 implication。",
      xTitle: "尖銳觀點同 thread 邏輯",
      xBody: "X 用嚟拆第一句 hook、反常識角度、論點推進、thread 結構，適合 thought leadership。",
      threadsTitle: "人味、共鳴、日常語氣",
      threadsBody: "Threads 用嚟睇 casual 開場、confession 式語氣、留言互動、每日存在感內容。",
      reelsTitle: "短片頭 3 秒同畫面節奏",
      reelsBody: "IG Reels 用嚟拆頭 3 秒、字幕、鏡頭、剪接 pacing、caption、save/share 觸發位。",
      tip: "Save 前問：『呢條對 Alvie career、business、CityU、AI usage、content creation、partnerships 有冇用？』冇就當 noise。",
      emptyTitle: "呢組 filter 暫時搵唔到 post。",
      emptyBody:
        "通常係 filter 太窄、刷新未搵到有用內容，或者 source/category settings 要調整。空 feed 唔等於壞咗；佢係提醒你要放闊範圍或者收窄策略。",
      emptyActions: [
        "先轉 All time / All sources，確認係咪真係冇 post。",
        "想即刻拉新素材，就撳 Force refresh。",
        "同一個 category 長期冇料，就去 Settings 改 keywords / accounts。",
      ],
      resetFilters: "重設做 broad feed",
      openSettings: "調整 Settings",
      refreshed: (count: string, errors: string | undefined) =>
        errors
          ? `刷新完：儲咗 ${count} 條 post，${errors} 個來源 run 有 error。可以試窄啲 source/category，或者睇 Apify actor logs。`
          : `刷新完：儲咗 ${count} 條 post。`,
    },
  });
  const refreshCount = params.refresh;
  const refreshErrors = params.errors;
  const categories = await getCategories();
  const activeCategory = params.category ?? categories[0]?.id;
  const activeCategoryData = categories.find(
    (category) => category.id === activeCategory,
  );
  const activeKeyword = params.keyword;
  const activeTime = parseTime(params.time);
  const activeSources = parseSources(params.source);
  const view = parseView(params.view);
  const posts = await getPosts({
    categoryId: activeCategory,
    keyword: activeKeyword,
    time: activeTime,
    source: activeSources,
  });
  const competitorKeys = await getCompetitorKeySet();
  const janiceSummaries = await getJaniceSummaries(posts);

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm text-slate-600">{copy.eyebrow}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">
            {copy.title}
          </h1>
        </div>
        <form action="/api/refresh" method="post">
          <input name="category" type="hidden" value={activeCategory ?? ""} />
          <input
            name="sources"
            type="hidden"
            value={activeSources.length ? activeSources.join(",") : "all"}
          />
          <Button type="submit" variant="secondary">
            <RefreshCw className="h-4 w-4" />
            {copy.refresh}
          </Button>
        </form>
      </header>

      {refreshCount ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-700">
          {copy.refreshed(refreshCount, refreshErrors)}
        </p>
      ) : null}

      <UsageGuide
        title={copy.guideTitle}
        description={copy.guideDescription}
        steps={[
          {
            label: "X",
            title: copy.xTitle,
            body: copy.xBody,
          },
          {
            label: "Threads",
            title: copy.threadsTitle,
            body: copy.threadsBody,
          },
          {
            label: "IG / YouTube",
            title: copy.reelsTitle,
            body: `${copy.reelsBody} YouTube is supported first through Quick Capture, not broad channel crawl.`,
          },
        ]}
        tip={copy.tip}
      />

      <section className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Janice Summary shell</p>
        <div className="mt-2 grid gap-3 md:grid-cols-4">
          {["Executive Summary", "Flags", "Implication for Alvie", "Recommended Action"].map((label) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <strong className="text-slate-950">{label}</strong>
              <p className="mt-1 text-xs leading-5 text-slate-500">Generated only from real selected/captured sources; Atlas does not fake summaries.</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((category) => (
            <FilterLink
              key={category.id}
              active={category.id === activeCategory}
              href={buildHref(params, {
                category: category.id,
                keyword: undefined,
              })}
            >
              <span
                className="mr-2 h-2 w-2 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              {category.name}
            </FilterLink>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <FilterLink
            active={!activeKeyword}
            href={buildHref(params, { keyword: undefined })}
          >
            All keywords
          </FilterLink>
          {activeCategoryData?.keywords.map((keyword) => (
            <FilterLink
              key={keyword}
              active={keyword === activeKeyword}
              href={buildHref(params, { keyword })}
            >
              {keyword}
            </FilterLink>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {TIME_FILTERS.map((filter) => (
            <FilterLink
              key={filter.value}
              active={activeTime === filter.value}
              href={buildHref(params, { time: filter.value })}
            >
              {filter.label}
            </FilterLink>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterLink
            active={activeSources.length === 0}
            href={buildHref(params, { source: undefined })}
          >
            All sources
          </FilterLink>
          {SOURCES.map((source) => (
            <FilterLink
              key={source.source}
              active={activeSources.includes(source.source)}
              href={buildHref(params, {
                source: toggleSource(activeSources, source.source),
              })}
            >
              <SourceIcon source={source.source} className="mr-1.5 h-3.5 w-3.5" />
              {source.label}
            </FilterLink>
          ))}
          <FilterLink
            active={view === "grid"}
            href={buildHref(params, { view: "grid" })}
          >
            <Grid2X2 className="h-4 w-4" />
          </FilterLink>
          <FilterLink
            active={view === "list"}
            href={buildHref(params, { view: "list" })}
          >
            <List className="h-4 w-4" />
          </FilterLink>
        </div>
      </section>

      {posts.length ? (
        <section
          className={cn(
            "grid gap-4",
            view === "grid"
              ? "grid-cols-1 lg:grid-cols-2 xl:grid-cols-3"
              : "grid-cols-1",
          )}
        >
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              view={view}
              isCompetitor={competitorKeys.has(
                competitorKey(post.source, post.authorHandle),
              )}
              janiceSummary={janiceSummaries.get(post.id)}
            />
          ))}
        </section>
      ) : (
        <section className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-base font-semibold text-slate-900">
              {copy.emptyTitle}
            </h2>
            <p className="mt-2 leading-6 text-slate-600">{copy.emptyBody}</p>
          </div>
          <div className="mx-auto mt-4 grid max-w-3xl gap-2 text-left md:grid-cols-3">
            {copy.emptyActions.map((action, index) => (
              <div
                key={action}
                className="rounded-md border border-slate-200 bg-slate-50/70 p-3 text-xs leading-5 text-slate-600"
              >
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700/80">
                  Step {index + 1}
                </span>
                {action}
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link
              className="rounded-md border border-blue-500/30 bg-blue-600/10 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-600/15"
              href="/inspiration?time=all"
            >
              {copy.resetFilters}
            </Link>
            <Link
              className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              href="/settings"
            >
              {copy.openSettings}
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
