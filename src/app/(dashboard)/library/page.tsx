import { FilterLink } from "@/components/app/filter-link";
import { UsageGuide } from "@/components/app/usage-guide";
import { LinkPasteBox } from "@/components/posts/link-paste-box";
import { PostCard } from "@/components/posts/post-card";
import { competitorKey, getCompetitorKeySet, getLibraryPosts } from "@/lib/data";
import { getJaniceSummaries, type JaniceSummary } from "@/lib/janice-summary";
import { getLanguage, pick } from "@/lib/language";
import type { Post } from "@/lib/types";

export const maxDuration = 60;

type LibraryPageProps = { searchParams: Promise<{ topic?: string; add?: string; captured?: string }> };
type AutoTopic = { slug: string; label: string; posts: Post[] };

function PostGrid({ posts, competitorKeys, summaries }: { posts: Post[]; competitorKeys: Set<string>; summaries: Map<string, JaniceSummary> }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} view="grid" compact isCompetitor={competitorKeys.has(competitorKey(post.source, post.authorHandle))} janiceSummary={summaries.get(post.id)} />
      ))}
    </div>
  );
}

const CONTENT_TOPICS = [
  {
    slug: "ai-automation-systems",
    label: "AI Automation Systems",
    words: ["vibe code", "cron", "skill", "sop", "automation", "自動", "codex", "workflow", "agent", "api"],
  },
  {
    slug: "ai-learning-career",
    label: "AI Learning + Career",
    words: ["course", "academy", "certification", "證書", "履歷", "aws", "google skills", "openai academy", "anthropic academy"],
  },
  {
    slug: "creator-growth-prompts",
    label: "Creator Growth + Prompts",
    words: ["threads", "followers", "reach", "sales", "prompt", "social media manager", "growth", "creator", "reels", "short-form"],
  },
  {
    slug: "ai-tools-products",
    label: "AI Tools + Products",
    words: ["tool", "claude", "openai", "gemini", "ai工具", "micro", "keyboard", "markitdown", "pdf", "markdown"],
  },
  {
    slug: "consumer-ai-trends",
    label: "Consumer AI Trends",
    words: ["算命", "八字", "紫微", "占星", "consumer", "網站", "免費", "app", "subscription", "gen z"],
  },
  {
    slug: "visual-content-references",
    label: "Visual Content References",
    words: ["#ai", "reel", "instagram", "視覺", "影片", "創作者", "內容", "template", "design"],
  },
];

function scorePost(post: Post, words: string[]): number {
  const text = `${post.text} ${post.authorName} ${post.authorHandle} ${post.source}`.toLowerCase();
  return words.reduce((sum, word) => sum + (text.includes(word.toLowerCase()) ? 1 : 0), 0);
}

function autoTopicForPost(post: Post): string {
  const ranked = CONTENT_TOPICS.map((topic) => ({ topic, score: scorePost(post, topic.words) })).sort((a, b) => b.score - a.score);

  if (ranked[0]?.score > 0) return ranked[0].topic.slug;
  if (post.source === "ig" || post.source === "youtube") return "visual-content-references";
  if (post.source === "threads" || post.source === "x") return "creator-growth-prompts";
  return "ai-tools-products";
}

function buildTopicHref(topic?: string): string {
  if (!topic) return "/library";
  const params = new URLSearchParams({ topic });
  return `/library?${params.toString()}`;
}

function buildAutoTopics(posts: Post[]): AutoTopic[] {
  const groups = CONTENT_TOPICS.map((topic) => ({
    slug: topic.slug,
    label: topic.label,
    posts: posts.filter((post) => autoTopicForPost(post) === topic.slug),
  })).filter((topic) => topic.posts.length > 0);

  const assigned = new Set(groups.flatMap((group) => group.posts.map((post) => post.id)));
  const otherPosts = posts.filter((post) => !assigned.has(post.id));
  return otherPosts.length ? [...groups, { slug: "other-useful-signals", label: "Other Useful Signals", posts: otherPosts }] : groups;
}

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const { topic, add, captured } = await searchParams;
  const language = await getLanguage();
  const copy = pick(language, {
    en: {
      eyebrow: "Quick Capture · save what is worth remembering forever",
      title: "Knowledge Bank",
      intro: "Paste IG / Threads / X / Facebook / YouTube, any website link, or raw text. Atlas keeps all previous V1 manual links and auto-groups cards by what the content is actually about.",
      ok: "✅ Captured into Knowledge Bank — check the newest card below.",
      fail: "Could not capture this link — paste it manually below, or confirm it is a public IG/Threads/X/Facebook/YouTube post.",
      emptyCapture: "The shortcut did not pass a link. Check that the Text action ends with a variable pill, or use the clipboard version.",
      guideTitle: "Knowledge Bank = permanent POV bank for high-value signals.",
      guideDescription: "Use Knowledge Bank when something is worth remembering beyond the 90-day Active Signals window. Tabs below are auto-created from the card content, not the old V1 output-purpose labels.",
      pasteTitle: "Add anything worth keeping",
      pasteBody: "Paste a public post, article, YouTube link, 小紅書 link, or your own note. Atlas will capture the content into the vault.",
      purposeTitle: "Auto-created topic tabs",
      purposeBody: "Atlas reads the saved cards and creates tabs such as AI automation systems, career learning, creator growth, tools/products, consumer AI trends, and visual references.",
      reuseTitle: "Turn signals into POV",
      reuseBody: "Open a saved card when you need a Janice summary, career language, CityU example, partnership angle, or business thesis.",
      tip: "Rule: Knowledge Bank includes previous V1 manual links. It should not hide older saves just because they lack V3 metadata.",
      all: "All saved items",
      emptyTopic: "No links for this auto-topic yet.",
      empty: "No saved links yet. Paste one above to start your library.",
      autoTitle: "Auto-created tabs by content",
      legacyNote: "The tabs are inferred from each card's text, author, source, and keywords. V1 purpose labels are no longer used as the main navigation.",
      count: "cards",
    },
    yue: {
      eyebrow: "Quick Capture · 儲低值得長期記住嘅 signal",
      title: "Knowledge Bank",
      intro: "貼 IG / Threads / X / Facebook / YouTube、任何網站連結，或者純文字。Atlas 會保留所有之前 V1 手動加入嘅 links，並按內容本身自動建立 tabs。",
      ok: "✅ 已擷取入 Knowledge Bank — 喺下面最新嗰張卡睇吓。",
      fail: "擷取唔到呢條 link — 試吓喺下面手動貼上，或者確認係公開 IG/Threads/X/Facebook/YouTube post。",
      emptyCapture: "Shortcut 冇傳到 link。確認 Text 尾巴有個變數膠囊，或者改用剪貼簿版本。",
      guideTitle: "Knowledge Bank = 高價值 signals / POV 嘅永久庫。",
      guideDescription: "值得過咗 90 日都留低嘅嘢，就放 Knowledge Bank。下面 tabs 會按 card 內容自動建立，唔再用舊 V1 output-purpose 做主要分類。",
      pasteTitle: "加入值得長期留嘅素材",
      pasteBody: "貼公開 post、文章、YouTube、小紅書 link，或者自己嘅 note。Atlas 會擷取入 vault。",
      purposeTitle: "自動內容 tabs",
      purposeBody: "Atlas 會讀 saved cards，自動分成 AI automation、career learning、creator growth、tools/products、consumer AI trends、visual references 等。",
      reuseTitle: "將 signal 變成 POV",
      reuseBody: "需要 Janice summary、career language、CityU example、partnership angle、business thesis 時，就打開 saved card。",
      tip: "規則：Knowledge Bank 包括之前 V1 manual links。舊 save 唔應該因為冇 V3 metadata 而被隱藏。",
      all: "全部 saved items",
      emptyTopic: "呢個自動 topic 暫時未有 link。",
      empty: "仲未有 saved links。喺上面貼第一條開始建立素材庫。",
      autoTitle: "按內容自動建立 tabs",
      legacyNote: "Tabs 由每張 card 嘅文字、作者、來源同 keywords 推斷；舊 V1 purpose labels 唔再做主要導航。",
      count: "張 cards",
    },
  });

  const [allPosts, competitorKeys] = await Promise.all([getLibraryPosts(), getCompetitorKeySet()]);
  const janiceSummaries = await getJaniceSummaries(allPosts, language);
  const autoTopics = buildAutoTopics(allPosts);
  const activeTopic = autoTopics.some((item) => item.slug === topic) ? topic : undefined;
  const posts = activeTopic ? autoTopics.find((item) => item.slug === activeTopic)?.posts ?? [] : allPosts;
  const sharedUrl = typeof add === "string" && add.trim() ? add.trim() : undefined;
  const captureStatus = captured === "1" ? "ok" : captured === "0" ? "fail" : captured === "empty" ? "empty" : null;
  const activeTopicLabel = activeTopic ? autoTopics.find((item) => item.slug === activeTopic)?.label : undefined;

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
      <header>
        <p className="text-sm text-slate-600">{copy.eyebrow}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">{copy.title}</h1>
        <p className="mt-1 text-sm text-slate-600">{copy.intro}</p>
      </header>
      {captureStatus === "ok" ? <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-700">{copy.ok}</p> : captureStatus === "fail" ? <p className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-2.5 text-sm text-blue-800">{copy.fail}</p> : captureStatus === "empty" ? <p className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-2.5 text-sm text-blue-800">{copy.emptyCapture}</p> : null}
      <LinkPasteBox initialUrl={sharedUrl} />
      <UsageGuide title={copy.guideTitle} description={copy.guideDescription} steps={[{ label: "Paste", title: copy.pasteTitle, body: copy.pasteBody }, { label: "Auto", title: copy.purposeTitle, body: copy.purposeBody }, { label: "Reuse", title: copy.reuseTitle, body: copy.reuseBody }]} tip={copy.tip} />

      <section className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-950">{copy.autoTitle}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">{copy.legacyNote}</p>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{posts.length} {copy.count}</span>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <FilterLink active={!activeTopic} href="/library">{copy.all}</FilterLink>
        {autoTopics.map((item) => <FilterLink key={item.slug} active={activeTopic === item.slug} href={buildTopicHref(item.slug)}>{item.label} ({item.posts.length})</FilterLink>)}
      </div>

      {posts.length ? (
        activeTopic ? (
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-950">{activeTopicLabel}</h2>
                <p className="text-xs text-slate-500">Cards in this tab were selected from their text, source, author, and keywords.</p>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-600">{posts.length}</span>
            </div>
            <PostGrid posts={posts} competitorKeys={competitorKeys} summaries={janiceSummaries} />
          </section>
        ) : (
          <div className="flex flex-col gap-6">
            {autoTopics.map((item) => (
              <section key={item.slug} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-slate-950">{item.label}</h2>
                    <p className="text-xs text-slate-500">Auto-created from saved card content.</p>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-600">{item.posts.length}</span>
                </div>
                <PostGrid posts={item.posts} competitorKeys={competitorKeys} summaries={janiceSummaries} />
              </section>
            ))}
          </div>
        )
      ) : <section className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">{activeTopic ? copy.emptyTopic : copy.empty}</section>}
    </main>
  );
}
