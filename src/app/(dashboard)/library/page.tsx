import { FilterLink } from "@/components/app/filter-link";
import { UsageGuide } from "@/components/app/usage-guide";
import { LinkPasteBox } from "@/components/posts/link-paste-box";
import { PostCard } from "@/components/posts/post-card";
import { competitorKey, getCompetitorKeySet, getLibraryPosts } from "@/lib/data";
import { getLanguage, pick } from "@/lib/language";
import { buildLibraryHref, parsePurpose } from "@/lib/search-params";
import { inferLearningAreaForPost, LEARNING_AREAS } from "@/lib/strategic-intelligence";
import { PURPOSES, type Post } from "@/lib/types";

export const maxDuration = 60;

type LibraryPageProps = { searchParams: Promise<{ purpose?: string; add?: string; captured?: string }> };

function PostGrid({ posts, competitorKeys }: { posts: Post[]; competitorKeys: Set<string> }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{posts.map((post) => <PostCard key={post.id} post={post} view="grid" compact isCompetitor={competitorKeys.has(competitorKey(post.source, post.authorHandle))} />)}</div>;
}

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const { purpose, add, captured } = await searchParams;
  const language = await getLanguage();
  const copy = pick(language, {
    en: {
      eyebrow: "Quick Capture · save what is worth remembering forever",
      title: "Knowledge Bank",
      intro: "Paste IG / Threads / X / Facebook / YouTube, any website link, or raw text. Atlas keeps all previous V1 manual links and auto-groups cards by strategic context.",
      ok: "✅ Captured into Knowledge Bank — check the newest card below.",
      fail: "⚠️ Could not capture this link — paste it manually below, or confirm it is a public IG/Threads/X/Facebook/YouTube post.",
      emptyCapture: "⚠️ The shortcut did not pass a link. Check that the Text action ends with a variable pill, or use the clipboard version.",
      guideTitle: "Knowledge Bank = permanent POV bank for high-value signals.",
      guideDescription: "Use Knowledge Bank when something is worth remembering beyond the 90-day Active Signals window. Cards below are auto-categorized by context using the Janice Executive Summary Hub learning areas.",
      pasteTitle: "Add anything worth keeping",
      pasteBody: "Paste a public post, article, YouTube link, 小紅書 link, or your own note. Atlas will capture the content into the vault.",
      purposeTitle: "Auto + manual category",
      purposeBody: "Atlas auto-groups by strategic context, while the existing V1 purpose filters still work so older links remain visible.",
      reuseTitle: "Turn signals into POV",
      reuseBody: "Open a saved card when you need a Janice summary, career language, CityU example, partnership angle, or business thesis.",
      tip: "Rule: Knowledge Bank includes previous V1 manual links. It should not hide older saves just because they lack V2 metadata.",
      all: "All V1 + V2 links",
      emptyPurpose: "No links for this purpose yet.",
      empty: "No saved links yet. Paste one above to start your library.",
      autoTitle: "Auto-categorized by strategic context",
      legacyNote: "Includes prior V1 manual links from the existing posts table; V2 metadata is inferred for display until DB columns are added.",
      sourceTitle: "All saved V1 items · source view",
      sourceNote: "This preserves the original Library grouping so previously saved Threads/X, web, IG, Facebook, YouTube, notes, and 小紅書 links stay visible in V2.",
      count: "cards",
    },
    yue: {
      eyebrow: "Quick Capture · 儲低值得長期記住嘅 signal",
      title: "Knowledge Bank",
      intro: "貼 IG / Threads / X / Facebook / YouTube、任何網站連結，或者純文字。Atlas 會保留所有之前 V1 手動加入嘅 links，並按 strategic context 自動分組。",
      ok: "✅ 已擷取入 Knowledge Bank — 喺下面最新嗰張卡睇吓。",
      fail: "⚠️ 擷取唔到呢條 link — 試吓喺下面手動貼上，或者確認係公開 IG/Threads/X/Facebook/YouTube post。",
      emptyCapture: "⚠️ Shortcut 冇傳到 link。確認 Text 尾巴有個變數膠囊，或者改用剪貼簿版本。",
      guideTitle: "Knowledge Bank = 高價值 signals / POV 嘅永久庫。",
      guideDescription: "值得過咗 90 日都留低嘅嘢，就放 Knowledge Bank。下面 cards 會用 Janice Executive Summary Hub learning areas 按 context 自動分類。",
      pasteTitle: "加入值得長期留嘅素材",
      pasteBody: "貼公開 post、文章、YouTube、小紅書 link，或者自己嘅 note。Atlas 會擷取入 vault。",
      purposeTitle: "自動 + 手動分類",
      purposeBody: "Atlas 會按 strategic context 自動分組；原有 V1 purpose filters 仍然保留，舊 links 唔會消失。",
      reuseTitle: "將 signal 變成 POV",
      reuseBody: "需要 Janice summary、career language、CityU example、partnership angle、business thesis 時，就打開 saved card。",
      tip: "規則：Knowledge Bank 包括之前 V1 manual links。舊 save 唔應該因為冇 V2 metadata 而被隱藏。",
      all: "全部 V1 + V2 links",
      emptyPurpose: "呢個用途未有 link。",
      empty: "仲未有 saved links。喺上面貼第一條開始建立素材庫。",
      autoTitle: "按 strategic context 自動分類",
      legacyNote: "包括 existing posts table 入面之前 V1 手動加入嘅 links；DB columns 未加前，V2 metadata 先用 display inference。",
      sourceTitle: "全部已儲 V1 items · source view",
      sourceNote: "保留原本 Library 分組，確保之前 saved Threads/X、web、IG、Facebook、YouTube、notes、小紅書 links 喺 V2 都睇到。",
      count: "張 cards",
    },
  });

  const activePurpose = parsePurpose(purpose);
  const [posts, competitorKeys] = await Promise.all([getLibraryPosts(activePurpose), getCompetitorKeySet()]);
  const sharedUrl = typeof add === "string" && add.trim() ? add.trim() : undefined;
  const captureStatus = captured === "1" ? "ok" : captured === "0" ? "fail" : captured === "empty" ? "empty" : null;
  const grouped = LEARNING_AREAS.map((area) => ({ area, posts: posts.filter((post) => inferLearningAreaForPost(post) === area.label) })).filter((group) => group.posts.length > 0);
  const sourceGroups = [
    { key: "text", label: "✍️ 文字 idea · Threads / X", posts: posts.filter((post) => post.source === "threads" || post.source === "x") },
    { key: "note", label: "📝 我嘅筆記", posts: posts.filter((post) => post.source === "note") },
    { key: "web", label: "🔗 網站文章 · Web", posts: posts.filter((post) => post.source === "web") },
    { key: "xhs", label: "📕 小紅書", posts: posts.filter((post) => post.source === "xiaohongshu") },
    { key: "ig", label: "🖼️ 視覺參考 · IG", posts: posts.filter((post) => post.source === "ig") },
    { key: "facebook", label: "📘 Facebook", posts: posts.filter((post) => post.source === "facebook") },
    { key: "youtube", label: "🎓 學習 · YouTube", posts: posts.filter((post) => post.source === "youtube") },
  ].filter((group) => group.posts.length > 0);

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
      <header><p className="text-sm text-slate-600">{copy.eyebrow}</p><h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">{copy.title}</h1><p className="mt-1 text-sm text-slate-600">{copy.intro}</p></header>
      {captureStatus === "ok" ? <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-700">{copy.ok}</p> : captureStatus === "fail" ? <p className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-2.5 text-sm text-blue-800">{copy.fail}</p> : captureStatus === "empty" ? <p className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-2.5 text-sm text-blue-800">{copy.emptyCapture}</p> : null}
      <LinkPasteBox initialUrl={sharedUrl} />
      <UsageGuide title={copy.guideTitle} description={copy.guideDescription} steps={[{ label: "Paste", title: copy.pasteTitle, body: copy.pasteBody }, { label: "Auto", title: copy.purposeTitle, body: copy.purposeBody }, { label: "Reuse", title: copy.reuseTitle, body: copy.reuseBody }]} tip={copy.tip} />

      <section className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-950">{copy.autoTitle}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{copy.legacyNote}</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{posts.length} {copy.count}</span></div></section>

      <div className="flex flex-wrap gap-2"><FilterLink active={!activePurpose} href="/library">{copy.all}</FilterLink>{PURPOSES.map((item) => <FilterLink key={item.value} active={activePurpose === item.value} href={buildLibraryHref(item.value)}>{item.label}</FilterLink>)}</div>

      {posts.length ? <div className="flex flex-col gap-6"><section className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-base font-bold text-slate-950">{copy.sourceTitle}</h2><p className="text-xs text-slate-500">{copy.sourceNote}</p></div><span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">{posts.length}</span></div><div className="flex flex-col gap-5">{sourceGroups.map((group) => <section key={group.key}><h3 className="mb-3 text-sm font-bold text-slate-700">{group.label} <span className="text-slate-400">({group.posts.length})</span></h3><PostGrid posts={group.posts} competitorKeys={competitorKeys} /></section>)}</div></section>{grouped.map(({ area, posts: areaPosts }) => <section key={area.slug} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-base font-bold text-slate-950">{area.label}</h2><p className="text-xs text-slate-500">Auto-categorized from card text, source, author, and existing V1 purpose.</p></div><span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-600">{areaPosts.length}</span></div><PostGrid posts={areaPosts} competitorKeys={competitorKeys} /></section>)}</div> : <section className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">{activePurpose ? copy.emptyPurpose : copy.empty}</section>}
    </main>
  );
}
