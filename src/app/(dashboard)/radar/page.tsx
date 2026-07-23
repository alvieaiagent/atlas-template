import { RefreshCw } from "lucide-react";
import { FilterLink } from "@/components/app/filter-link";
import { UsageGuide } from "@/components/app/usage-guide";
import { PostCard } from "@/components/posts/post-card";
import { RadarSaveButton } from "@/components/posts/radar-save-button";
import { ThreadButton } from "@/components/posts/thread-button";
import { Button } from "@/components/ui/button";
import { getCategories, getRadarPosts } from "@/lib/data";
import { getJaniceSummaries } from "@/lib/janice-summary";
import { getLanguage, pick } from "@/lib/language";
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
  const language = await getLanguage();
  const copy = pick(language, {
    en: {
      eyebrow: "Daily scan: GitHub / Big Tech updates / new tools · save winners · draft Threads",
      title: "🛰️ AI Radar → Thread",
      refresh: "Fetch latest",
      guideTitle: "AI Radar = timely raw material for fast Threads / X posts.",
      guideDescription:
        "This tab is for news and tool signals that expire quickly. Treat it as a radar, not a permanent library: scan fresh updates, save only the ones with a clear opinion angle, then generate a draft while the topic is still warm.",
      latest: "🔥 Latest",
      saved: "⭐ Saved",
      all: "All",
      emptyCategories: "No Radar categories yet — run `npm run db:seed-defaults` inside atlas/ to seed them.",
      emptySaved: "No saved Radar items yet — go to Latest and save the strongest signals.",
      emptyLatest: "No fresh signals in this time window — fetch latest or widen the time range.",
      scanTitle: "Scan the freshest signals",
      scanBody: "Use 48h by default. Shorten to 4h / 24h when you want breaking updates; extend to 7d when the feed is too empty.",
      saveTitle: "Keep only post-worthy items",
      saveBody: "Save an item only if you can add a POV, explain why it matters, or turn it into a useful mini-thread.",
      threadTitle: "Convert before it goes stale",
      threadBody: "Use the Thread button after saving to turn the update into a clear hook, short explanation, and practical takeaway.",
      tip: "Good Radar test: would your audience care today? If it is merely interesting but has no take, leave it unsaved.",
    },
    yue: {
      eyebrow: "每日掃 GitHub / 大廠更新 / 新工具 · 收藏正嗰啲 · 一鍵出 Threads",
      title: "🛰️ AI 雷達 → Thread",
      refresh: "抓最新",
      guideTitle: "AI 雷達 = 快速出 Threads / X post 嘅時效素材。",
      guideDescription:
        "呢個 tab 係睇好快過期嘅 news 同 tool signal。當佢係 radar，唔係永久 library：掃最新、只收藏有觀點角度嘅 signal，然後趁熱 generate draft。",
      latest: "🔥 最新",
      saved: "⭐ 收藏",
      all: "全部",
      emptyCategories: "仲未有 Radar 分類 —— 喺 atlas/ 行 `npm run db:seed-defaults` 種返先。",
      emptySaved: "仲未收藏任何嘢 —— 去「最新」度撳「收藏」留低你覺得正嗰啲。",
      emptyLatest: "呢個時段未有新料 —— 撳「抓最新」，或者調長時間範圍。",
      scanTitle: "掃最新 signal",
      scanBody: "預設用 48h。想追 breaking update 就縮去 4h / 24h；feed 太空就拉長到 7d。",
      saveTitle: "只留值得出 post 嘅 item",
      saveBody: "如果你可以加 POV、解釋點解重要、或者變成 mini-thread，先好收藏。",
      threadTitle: "趁未過期前轉成草稿",
      threadBody: "收藏後用 Thread button，將 update 變成 hook、短解釋同 practical takeaway。",
      tip: "Radar 測試：你 audience 今日會唔會 care？純粹有趣但冇 take，就唔好 save。",
    },
  });
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
        <form action="/api/refresh/radar" method="post">
          <Button type="submit" variant="secondary">
            <RefreshCw className="h-4 w-4" />
            {copy.refresh}
          </Button>
        </form>
      </header>

      <UsageGuide
        title={copy.guideTitle}
        description={copy.guideDescription}
        steps={[
          {
            label: "🔥 最新",
            title: copy.scanTitle,
            body: copy.scanBody,
          },
          {
            label: "⭐ 收藏",
            title: copy.saveTitle,
            body: copy.saveBody,
          },
          {
            label: "Thread",
            title: copy.threadTitle,
            body: copy.threadBody,
          },
        ]}
        tip={copy.tip}
      />

      {/* 最新（即棄）/ 收藏（留底）*/}
      <div className="flex gap-2">
        <FilterLink active={!savedTab} href={radarHref(params, { tab: undefined })}>
          {copy.latest}
        </FilterLink>
        <FilterLink active={savedTab} href={radarHref(params, { tab: "saved" })}>
          {copy.saved}
        </FilterLink>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <FilterLink active={!activeCategory} href={radarHref(params, { category: undefined })}>
            {copy.all}
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
        <section className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
          {copy.emptyCategories}
        </section>
      ) : posts.length ? (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              view="grid"
              janiceSummary={janiceSummaries.get(post.id)}
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
        <section className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
          {savedTab
            ? copy.emptySaved
            : copy.emptyLatest}
        </section>
      )}
    </main>
  );
}
