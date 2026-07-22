import { Grid2X2, List, RefreshCw } from "lucide-react";
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
import { cn } from "@/lib/utils";

type InspirationPageProps = {
  searchParams: Promise<InspirationSearchParams>;
};

export default async function InspirationPage({
  searchParams,
}: InspirationPageProps) {
  const params = await searchParams;
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

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm text-zinc-500">Live inspiration feed</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-zinc-50">
            Inspiration
          </h1>
        </div>
        <form action="/api/refresh" method="post">
          <Button type="submit" variant="secondary">
            <RefreshCw className="h-4 w-4" />
            Force refresh
          </Button>
        </form>
      </header>

      <UsageGuide
        title="Inspiration = live feed for patterns you can reuse."
        description="This tab is for scanning fresh X, Threads, and IG Reels references. The job is not to collect links; the job is to spot a hook, angle, format, CTA, or visual rhythm you can remix into your own content."
        steps={[
          {
            label: "X",
            title: "Sharp takes & thread logic",
            body: "Use X to study first-line hooks, contrarian angles, argument flow, and thread structures for thought leadership posts.",
          },
          {
            label: "Threads",
            title: "Human voice & relatability",
            body: "Use Threads to study casual phrasing, confession-style openings, community prompts, and daily presence content.",
          },
          {
            label: "IG Reels",
            title: "Video hook & visual rhythm",
            body: "Use IG Reels to study the first 3 seconds, on-screen text, camera pattern, edit pacing, caption, and save/share triggers.",
          },
        ]}
        tip={
          <>
            Before pressing Mark, ask: “Can I explain why this works in one sentence?”
            If yes, mark it as Carousel / Reel / 攻略圖. If no, skip it.
          </>
        }
      />

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

      <section className="flex flex-col gap-3 rounded-lg border border-zinc-850 bg-zinc-900 p-3 lg:flex-row lg:items-center lg:justify-between">
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
            />
          ))}
        </section>
      ) : (
        <section className="rounded-lg border border-zinc-850 bg-zinc-900 p-8 text-center text-sm text-zinc-500">
          No posts match the current filters.
        </section>
      )}
    </main>
  );
}
