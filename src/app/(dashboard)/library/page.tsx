import { FilterLink } from "@/components/app/filter-link";
import { LinkPasteBox } from "@/components/posts/link-paste-box";
import { PostCard } from "@/components/posts/post-card";
import { competitorKey, getCompetitorKeySet, getLibraryPosts } from "@/lib/data";
import { buildLibraryHref, parsePurpose } from "@/lib/search-params";
import { PURPOSES, type Post } from "@/lib/types";

// Heavy server actions (Apify resolve, Gemini transcribe/generate) run from this page.
export const maxDuration = 60;

function PostGrid({
  posts,
  competitorKeys,
}: {
  posts: Post[];
  competitorKeys: Set<string>;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          view="grid"
          compact
          isCompetitor={competitorKeys.has(
            competitorKey(post.source, post.authorHandle),
          )}
        />
      ))}
    </div>
  );
}

type LibraryPageProps = {
  searchParams: Promise<{ purpose?: string; add?: string; captured?: string }>;
};

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const { purpose, add, captured } = await searchParams;
  const activePurpose = parsePurpose(purpose);
  const [posts, competitorKeys] = await Promise.all([
    getLibraryPosts(activePurpose),
    getCompetitorKeySet(),
  ]);
  // /library?add=<url> (iOS share-sheet shortcut) → auto-resolve on open.
  const sharedUrl = typeof add === "string" && add.trim() ? add.trim() : undefined;
  // /capture redirects here with ?captured=1|0|empty after the share shortcut runs.
  const captureStatus =
    captured === "1"
      ? "ok"
      : captured === "0"
        ? "fail"
        : captured === "empty"
          ? "empty"
          : null;

  // Split into 文字 idea (Threads / X) · 筆記 (note) · 網站 (web) · 視覺 (IG) · Facebook ·
  // 學習 (YouTube); order within each kept.
  const textPosts = posts.filter(
    (post) => post.source === "threads" || post.source === "x",
  );
  const notePosts = posts.filter((post) => post.source === "note");
  const webPosts = posts.filter((post) => post.source === "web");
  const xhsPosts = posts.filter((post) => post.source === "xiaohongshu");
  const igPosts = posts.filter((post) => post.source === "ig");
  const fbPosts = posts.filter((post) => post.source === "facebook");
  const ytPosts = posts.filter((post) => post.source === "youtube");

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
      <header>
        <p className="text-sm text-zinc-500">Paste a link · build your idea library</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-normal text-zinc-50">
          Library
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          貼 IG / Threads / X / Facebook / YouTube,或**任何網站連結**,甚至**一段純文字** —
          Atlas 會抓返內容、auto-suggest 用途,再生成啱嘅 artifact。
        </p>
      </header>

      {captureStatus === "ok" ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-300">
          ✅ 已擷取入 Library — 喺下面最新嗰張卡睇吓。
        </p>
      ) : captureStatus === "fail" ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-300">
          ⚠️ 擷取唔到呢條 link — 試吓喺下面手動貼上,或者確認係公開 IG/Threads/X/Facebook/YouTube post。
        </p>
      ) : captureStatus === "empty" ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-300">
          ⚠️ Shortcut 冇傳到 link(url 空白)。確認 Text 尾巴有個變數膠囊,或者改用剪貼簿版本。
        </p>
      ) : null}

      <LinkPasteBox initialUrl={sharedUrl} />

      <div className="flex flex-wrap gap-2">
        <FilterLink active={!activePurpose} href="/library">
          全部
        </FilterLink>
        {PURPOSES.map((item) => (
          <FilterLink
            key={item.value}
            active={activePurpose === item.value}
            href={buildLibraryHref(item.value)}
          >
            {item.label}
          </FilterLink>
        ))}
      </div>

      {posts.length ? (
        <div className="flex flex-col gap-6">
          {textPosts.length ? (
            <section>
              <h2 className="mb-3 text-sm font-medium text-zinc-300">
                ✍️ 文字 idea · Threads / X{" "}
                <span className="text-zinc-600">({textPosts.length})</span>
              </h2>
              <PostGrid posts={textPosts} competitorKeys={competitorKeys} />
            </section>
          ) : null}
          {notePosts.length ? (
            <section>
              <h2 className="mb-3 text-sm font-medium text-zinc-300">
                📝 我嘅筆記{" "}
                <span className="text-zinc-600">({notePosts.length})</span>
              </h2>
              <PostGrid posts={notePosts} competitorKeys={competitorKeys} />
            </section>
          ) : null}
          {webPosts.length ? (
            <section>
              <h2 className="mb-3 text-sm font-medium text-zinc-300">
                🔗 網站文章 · Web{" "}
                <span className="text-zinc-600">({webPosts.length})</span>
              </h2>
              <PostGrid posts={webPosts} competitorKeys={competitorKeys} />
            </section>
          ) : null}
          {xhsPosts.length ? (
            <section>
              <h2 className="mb-3 text-sm font-medium text-zinc-300">
                📕 小紅書{" "}
                <span className="text-zinc-600">({xhsPosts.length})</span>
              </h2>
              <PostGrid posts={xhsPosts} competitorKeys={competitorKeys} />
            </section>
          ) : null}
          {igPosts.length ? (
            <section>
              <h2 className="mb-3 text-sm font-medium text-zinc-300">
                🖼️ 視覺參考 · IG{" "}
                <span className="text-zinc-600">({igPosts.length})</span>
              </h2>
              <PostGrid posts={igPosts} competitorKeys={competitorKeys} />
            </section>
          ) : null}
          {fbPosts.length ? (
            <section>
              <h2 className="mb-3 text-sm font-medium text-zinc-300">
                📘 Facebook{" "}
                <span className="text-zinc-600">({fbPosts.length})</span>
              </h2>
              <PostGrid posts={fbPosts} competitorKeys={competitorKeys} />
            </section>
          ) : null}
          {ytPosts.length ? (
            <section>
              <h2 className="mb-3 text-sm font-medium text-zinc-300">
                🎓 學習 · YouTube{" "}
                <span className="text-zinc-600">({ytPosts.length})</span>
              </h2>
              <PostGrid posts={ytPosts} competitorKeys={competitorKeys} />
            </section>
          ) : null}
        </div>
      ) : (
        <section className="rounded-lg border border-zinc-850 bg-zinc-900 p-8 text-center text-sm text-zinc-500">
          {activePurpose ? "呢個用途未有 link。" : "No saved links yet. Paste one above to start your library."}
        </section>
      )}
    </main>
  );
}
