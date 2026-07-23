import { getJaniceSummaries } from "@/lib/janice-summary";
import { Bookmark } from "lucide-react";
import { UsageGuide } from "@/components/app/usage-guide";
import { PostCard } from "@/components/posts/post-card";
import { Badge } from "@/components/ui/badge";
import {
  competitorKey,
  getCompetitorKeySet,
  getMarkedPosts,
} from "@/lib/data";
import { getLanguage, pick } from "@/lib/language";

export default async function MarkedPage() {
  const language = await getLanguage();
  const copy = pick(language, {
    en: {
      eyebrow: "Saved ideas",
      title: "Marked",
      saved: "saved",
      guideTitle: "Marked = your weekly review queue.",
      guideDescription:
        "This tab collects the references you already decided are worth studying. Use it to turn saved inspiration into your own drafts instead of letting good examples rot in the feed.",
      reviewTitle: "Batch-process saved ideas",
      reviewBody: "Once or twice a week, review only this tab. It is smaller and higher quality than the live feed.",
      decodeTitle: "Name why each post works",
      decodeBody: "Write down the hook, tension, proof, payoff, CTA, or visual pattern before creating your own version.",
      useTitle: "Mark used after publishing",
      useBody: "After you turn a reference into a post, mark it as used so the queue stays clean and you avoid repeating the same angle.",
      tip: "If an item no longer feels useful during review, unmark it. A clean queue is more valuable than a huge archive.",
      workflow: "Marked → Generate → Used workflow",
      pickTitle: "1. Pick the output",
      pickBody: "Set 用途 first: Reel 腳本, Carousel, 一頁攻略圖, Swipe 拆解, 學習研究, or 商業/Offer. This tells Atlas what kind of draft you need.",
      generateTitle: "2. Generate your version",
      generateBody: "Press ✨ 生成 only after the purpose is right. Copy the result, then edit it into Alvie voice instead of publishing raw AI output.",
      usedTitle: "3. Mark used",
      usedBody: "After the draft becomes a real post/script, press 標記已用. Your queue stays clean and you avoid recycling the same reference too often.",
      empty: "No marked posts yet.",
      status: "Status",
      marked: "Marked",
    },
    yue: {
      eyebrow: "已儲低嘅 ideas",
      title: "已 Mark",
      saved: "已儲",
      guideTitle: "已 Mark = 每週覆盤 queue。",
      guideDescription:
        "呢個 tab 收集你已經覺得值得研究嘅 reference。用佢將靈感變成自己嘅 draft，唔好俾好例子爛喺 feed 入面。",
      reviewTitle: "集中處理已儲 ideas",
      reviewBody: "每週一至兩次只睇呢個 tab。佢比 live feed 細，而且質素更高。",
      decodeTitle: "講清楚每個 post 點解 work",
      decodeBody: "創作自己版本之前，先寫低 hook、張力、證明、payoff、CTA 或視覺 pattern。",
      useTitle: "出街後標記已用",
      useBody: "Reference 變成真 post / script 之後，就標記已用，保持 queue 乾淨，避免重複同一角度。",
      tip: "覆盤時覺得冇用就 unmark。乾淨 queue 比巨大 archive 更有價值。",
      workflow: "Marked → Generate → Used 工作流",
      pickTitle: "1. 先揀輸出形式",
      pickBody: "先設定用途：Reel 腳本、Carousel、一頁攻略圖、Swipe 拆解、學習研究、商業/Offer。Atlas 先知你要咩 draft。",
      generateTitle: "2. 生成你自己版本",
      generateBody: "用途正確先撳 ✨ 生成。Copy 結果後，要改成 Alvie voice，唔好直接 publish 原裝 AI output。",
      usedTitle: "3. 標記已用",
      usedBody: "草稿變成真 post/script 後撳 標記已用，queue 會乾淨啲，亦唔會成日 recycle 同一 reference。",
      empty: "仲未 Mark 任何 post。",
      status: "狀態",
      marked: "Marked 於",
    },
  });
  const posts = await getMarkedPosts();
  const janiceSummaries = await getJaniceSummaries(posts, language);
  const competitorKeys = await getCompetitorKeySet();

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm text-slate-600">{copy.eyebrow}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">
            {copy.title}
          </h1>
        </div>
        <Badge tone="blue">
          <Bookmark className="mr-1 h-3.5 w-3.5" />
          {posts.length} {copy.saved}
        </Badge>
      </header>

      <UsageGuide
        title={copy.guideTitle}
        description={copy.guideDescription}
        steps={[
          {
            label: "Review",
            title: copy.reviewTitle,
            body: copy.reviewBody,
          },
          {
            label: "Decode",
            title: copy.decodeTitle,
            body: copy.decodeBody,
          },
          {
            label: "Use",
            title: copy.useTitle,
            body: copy.useBody,
          },
        ]}
        tip={copy.tip}
      />

      <section className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.06] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700/80">
          {copy.workflow}
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
            <h2 className="text-sm font-semibold text-slate-900">{copy.pickTitle}</h2>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              {copy.pickBody}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
            <h2 className="text-sm font-semibold text-slate-900">{copy.generateTitle}</h2>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              {copy.generateBody}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
            <h2 className="text-sm font-semibold text-slate-900">{copy.usedTitle}</h2>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              {copy.usedBody}
            </p>
          </div>
        </div>
      </section>

      {posts.length ? (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {posts.map((post) => (
            <div key={post.id} className="space-y-2">
              <PostCard
                post={post}
                view="list"
                isCompetitor={competitorKeys.has(
                  competitorKey(post.source, post.authorHandle),
                )}
                janiceSummary={janiceSummaries.get(post.id)}
              />
              <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                {copy.status}: {post.status} · {copy.marked}{" "}
                {new Intl.DateTimeFormat("en-HK", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                }).format(new Date(post.markedAt))}
              </div>
            </div>
          ))}
        </section>
      ) : (
        <section className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
          {copy.empty}
        </section>
      )}
    </main>
  );
}
