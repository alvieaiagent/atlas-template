import { FilterLink } from "@/components/app/filter-link";
import { UsageGuide } from "@/components/app/usage-guide";
import { LinkPasteBox } from "@/components/posts/link-paste-box";
import { PostCard } from "@/components/posts/post-card";
import { competitorKey, getCompetitorKeySet, getLibraryPosts } from "@/lib/data";
import { getLanguage, pick } from "@/lib/language";
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
  const language = await getLanguage();
  const copy = pick(language, {
    en: {
      eyebrow: "Quick Capture · save what is worth remembering forever",
      title: "Knowledge Bank",
      intro: "Paste IG / Threads / X / Facebook / YouTube, any website link, or raw text. Atlas captures useful signals, keeps raw notes honest when APIs fail, and saves long-term POV material here.",
      ok: "✅ Captured into Knowledge Bank — check the newest card below.",
      fail: "⚠️ Could not capture this link — paste it manually below, or confirm it is a public IG/Threads/X/Facebook/YouTube post.",
      emptyCapture: "⚠️ The shortcut did not pass a link. Check that the Text action ends with a variable pill, or use the clipboard version.",
      guideTitle: "Knowledge Bank = permanent POV bank for high-value signals.",
      guideDescription: "Use Knowledge Bank when something is worth remembering beyond the 90-day Active Signals window. It accepts IG / Threads / X / Facebook / YouTube / website links or raw notes, then classifies them by use case.",
      pasteTitle: "Add anything worth keeping",
      pasteBody: "Paste a public post, article, YouTube link, 小紅書 link, or your own note. Atlas will capture the content into the vault.",
      purposeTitle: "Filter by worth/use",
      purposeBody: "Use for Career, Business, CityU, AI, Content Creation, Partnership, Build POV, Case Study, Market Signal, Watch Later, or Ignore / Noise.",
      reuseTitle: "Turn signals into POV",
      reuseBody: "Open a saved card when you need a Janice summary, career language, CityU example, partnership angle, or business thesis.",
      tip: "Rule: Signals is for scanning. Knowledge Bank is for material Alvie may reuse forever. Do not dump every random link here.",
      all: "All",
      emptyPurpose: "No links for this purpose yet.",
      empty: "No saved links yet. Paste one above to start your library.",
    },
    yue: {
      eyebrow: "Quick Capture · 儲低值得長期記住嘅 signal",
      title: "Knowledge Bank",
      intro: "貼 IG / Threads / X / Facebook / YouTube、任何網站連結，或者一段純文字。Atlas 會擷取有用 signal；API fail 就老實保留 raw note/link，唔會扮有 summary。",
      ok: "✅ 已擷取入 Knowledge Bank — 喺下面最新嗰張卡睇吓。",
      fail: "⚠️ 擷取唔到呢條 link — 試吓喺下面手動貼上，或者確認係公開 IG/Threads/X/Facebook/YouTube post。",
      emptyCapture: "⚠️ Shortcut 冇傳到 link。確認 Text 尾巴有個變數膠囊，或者改用剪貼簿版本。",
      guideTitle: "Knowledge Bank = 高價值 signals / POV 嘅永久庫。",
      guideDescription: "當你知道某樣嘢值得過咗 90 日都留低，就放 Knowledge Bank。佢接受 IG / Threads / X / Facebook / YouTube / website links 或 raw notes，再按用途分類。",
      pasteTitle: "加入值得長期留嘅素材",
      pasteBody: "貼公開 post、文章、YouTube、小紅書 link，或者自己嘅 note。Atlas 會擷取入 vault。",
      purposeTitle: "用值得程度 / 用途 filter",
      purposeBody: "Use for Career、Business、CityU、AI、Content Creation、Partnership、Build POV、Case Study、Market Signal、Watch Later、Ignore / Noise。",
      reuseTitle: "將 signal 變成 POV",
      reuseBody: "需要 Janice summary、career language、CityU example、partnership angle、business thesis 時，就打開 saved card。",
      tip: "規則：Signals 用嚟掃；Knowledge Bank 只放值得長期留低嘅材料。唔好亂倒垃圾 link 入嚟。",
      all: "全部",
      emptyPurpose: "呢個用途未有 link。",
      empty: "仲未有 saved links。喺上面貼第一條開始建立素材庫。",
    },
  });
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
        <p className="text-sm text-slate-600">{copy.eyebrow}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">
          {copy.title}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {copy.intro}
        </p>
      </header>

      {captureStatus === "ok" ? (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-700">
          {copy.ok}
        </p>
      ) : captureStatus === "fail" ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-700">
          {copy.fail}
        </p>
      ) : captureStatus === "empty" ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-700">
          {copy.emptyCapture}
        </p>
      ) : null}

      <LinkPasteBox initialUrl={sharedUrl} />

      <UsageGuide
        title={copy.guideTitle}
        description={copy.guideDescription}
        steps={[
          {
            label: "Paste",
            title: copy.pasteTitle,
            body: copy.pasteBody,
          },
          {
            label: "Purpose",
            title: copy.purposeTitle,
            body: copy.purposeBody,
          },
          {
            label: "Reuse",
            title: copy.reuseTitle,
            body: copy.reuseBody,
          },
        ]}
        tip={copy.tip}
      />

      <div className="flex flex-wrap gap-2">
        <FilterLink active={!activePurpose} href="/library">
          {copy.all}
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
              <h2 className="mb-3 text-sm font-medium text-slate-700">
                ✍️ 文字 idea · Threads / X{" "}
                <span className="text-slate-400">({textPosts.length})</span>
              </h2>
              <PostGrid posts={textPosts} competitorKeys={competitorKeys} />
            </section>
          ) : null}
          {notePosts.length ? (
            <section>
              <h2 className="mb-3 text-sm font-medium text-slate-700">
                📝 我嘅筆記{" "}
                <span className="text-slate-400">({notePosts.length})</span>
              </h2>
              <PostGrid posts={notePosts} competitorKeys={competitorKeys} />
            </section>
          ) : null}
          {webPosts.length ? (
            <section>
              <h2 className="mb-3 text-sm font-medium text-slate-700">
                🔗 網站文章 · Web{" "}
                <span className="text-slate-400">({webPosts.length})</span>
              </h2>
              <PostGrid posts={webPosts} competitorKeys={competitorKeys} />
            </section>
          ) : null}
          {xhsPosts.length ? (
            <section>
              <h2 className="mb-3 text-sm font-medium text-slate-700">
                📕 小紅書{" "}
                <span className="text-slate-400">({xhsPosts.length})</span>
              </h2>
              <PostGrid posts={xhsPosts} competitorKeys={competitorKeys} />
            </section>
          ) : null}
          {igPosts.length ? (
            <section>
              <h2 className="mb-3 text-sm font-medium text-slate-700">
                🖼️ 視覺參考 · IG{" "}
                <span className="text-slate-400">({igPosts.length})</span>
              </h2>
              <PostGrid posts={igPosts} competitorKeys={competitorKeys} />
            </section>
          ) : null}
          {fbPosts.length ? (
            <section>
              <h2 className="mb-3 text-sm font-medium text-slate-700">
                📘 Facebook{" "}
                <span className="text-slate-400">({fbPosts.length})</span>
              </h2>
              <PostGrid posts={fbPosts} competitorKeys={competitorKeys} />
            </section>
          ) : null}
          {ytPosts.length ? (
            <section>
              <h2 className="mb-3 text-sm font-medium text-slate-700">
                🎓 學習 · YouTube{" "}
                <span className="text-slate-400">({ytPosts.length})</span>
              </h2>
              <PostGrid posts={ytPosts} competitorKeys={competitorKeys} />
            </section>
          ) : null}
        </div>
      ) : (
        <section className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
          {activePurpose ? copy.emptyPurpose : copy.empty}
        </section>
      )}
    </main>
  );
}
