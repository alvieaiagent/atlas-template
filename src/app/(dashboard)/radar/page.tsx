import { RefreshCw } from "lucide-react";
import { FilterLink } from "@/components/app/filter-link";
import { PostCard } from "@/components/posts/post-card";
import { RadarSaveButton } from "@/components/posts/radar-save-button";
import { ThreadButton } from "@/components/posts/thread-button";
import { Button } from "@/components/ui/button";
import { getCategories, getRadarPosts } from "@/lib/data";
import { parseTime, type InspirationSearchParams } from "@/lib/search-params";
import { TIME_FILTERS, type TimeFilter } from "@/lib/types";

type RadarPageProps = {
  searchParams: Promise<InspirationSearchParams>;
};

// Radar links stay on /radar (buildHref hardcodes /inspiration, so we build our own).
function radarHref(
  params: InspirationSearchParams,
  updates: InspirationSearchParams,
): string {
  const merged = { ...params, ...updates };
  const next = new URLSearchParams();
  if (merged.category) next.set("category", merged.category);
  if (merged.time) next.set("time", merged.time);
  if (merged.tab === "saved") next.set("tab", "saved");
  const query = next.toString();
  return query ? `/radar?${query}` : "/radar";
}

export default async function RadarPage({ searchParams }: RadarPageProps) {
  const params = await searchParams;
  const categories = await getCategories();
  const radarCategories = categories.filter(
    (category) => category.sortOrder >= 100,
  );

  const savedTab = params.tab === "saved";
  const activeCategory = params.category;
  // 最新 = ephemeral fresh feed, default 48h; 收藏 ignores time (permanent).
  const activeTime: TimeFilter = params.time ? parseTime(params.time) : "48h";

  const posts = await getRadarPosts({
    radarCategory: activeCategory,
    ...(savedTab ? { savedOnly: true } : { time: activeTime }),
  });

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm text-zinc-500">
            每日掃 GitHub / 大廠更新 / 新工具 · 收藏正嗰啲 · 一鍵出 Threads
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-zinc-50">
            🛰️ AI Radar → Thread
          </h1>
        </div>
        <form action="/api/refresh/radar" method="post">
          <Button type="submit" variant="secondary">
            <RefreshCw className="h-4 w-4" />
            抓最新
          </Button>
        </form>
      </header>

      {/* 最新（即棄）/ 收藏（留底）*/}
      <div className="flex gap-2">
        <FilterLink active={!savedTab} href={radarHref(params, { tab: undefined })}>
          🔥 最新
        </FilterLink>
        <FilterLink active={savedTab} href={radarHref(params, { tab: "saved" })}>
          ⭐ 收藏
        </FilterLink>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <FilterLink active={!activeCategory} href={radarHref(params, { category: undefined })}>
            全部
          </FilterLink>
          {radarCategories.map((category) => (
            <FilterLink
              key={category.id}
              active={category.id === activeCategory}
              href={radarHref(params, { category: category.id })}
            >
              <span
                className="mr-2 h-2 w-2 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              {category.name}
            </FilterLink>
          ))}
        </div>

        {!savedTab && (
          <div className="flex flex-wrap gap-2">
            {TIME_FILTERS.map((filter) => (
              <FilterLink
                key={filter.value}
                active={activeTime === filter.value}
                href={radarHref(params, { time: filter.value })}
              >
                {filter.label}
              </FilterLink>
            ))}
          </div>
        )}
      </section>

      {radarCategories.length === 0 ? (
        <section className="rounded-lg border border-zinc-850 bg-zinc-900 p-8 text-center text-sm text-zinc-500">
          仲未有 Radar 分類 —— 喺 atlas/ 行 `npm run db:seed-defaults` 種返先。
        </section>
      ) : posts.length ? (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              view="grid"
              actions={
                <div className="flex flex-col gap-2">
                  <RadarSaveButton post={post} />
                  <ThreadButton post={post} />
                </div>
              }
            />
          ))}
        </section>
      ) : (
        <section className="rounded-lg border border-zinc-850 bg-zinc-900 p-8 text-center text-sm text-zinc-500">
          {savedTab
            ? "仲未收藏任何嘢 —— 去「最新」度撳「收藏」留低你覺得正嗰啲。"
            : "呢個時段未有新料 —— 撳「抓最新」，或者調長時間範圍。"}
        </section>
      )}
    </main>
  );
}
