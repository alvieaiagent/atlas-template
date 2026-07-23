import {
  Bookmark,
  CheckCircle2,
  Heart,
  MessageCircle,
  Play,
  Share2,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { addCompetitorAction, removeCompetitorAction } from "@/lib/actions";
import type { Post, ViewMode } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { CardActions } from "@/components/posts/card-actions";
import { SourceIcon } from "@/components/posts/source-icon";
import { DeleteButton } from "@/components/posts/delete-button";
import { proxiedImage } from "@/lib/image-proxy";

type PostCardProps = {
  post: Post;
  view: ViewMode;
  compact?: boolean;
  isCompetitor?: boolean;
  // Override the default footer actions (Mark / 拍片 / ✨生成). The Twitter→Thread
  // column passes <ThreadButton /> here. Defaults to <CardActions /> when omitted.
  actions?: React.ReactNode;
};

const sourceLabels: Record<Post["source"], string> = {
  x: "X",
  threads: "Threads",
  ig: "IG",
  youtube: "YT",
  facebook: "FB",
  web: "Web",
  note: "筆記",
  xiaohongshu: "小紅書",
};

// Source-tinted accent for the text-only (no hero image) quote panel.
const accentBorder: Record<Post["source"], string> = {
  x: "border-sky-500/60",
  threads: "border-zinc-400/50",
  ig: "border-pink-500/60",
  youtube: "border-red-500/60",
  facebook: "border-blue-500/60",
  web: "border-emerald-500/60",
  note: "border-blue-200",
  xiaohongshu: "border-rose-500/60",
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en", {
    notation: value >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-HK", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function PostCard({
  post,
  view,
  compact = false,
  isCompetitor = false,
  actions,
}: PostCardProps) {
  const firstMedia = post.media[0];

  // Only show engagement stats that actually have a value — text posts (Threads)
  // otherwise render a row of meaningless zeros.
  const stats = [
    { key: "play", icon: Play, value: post.engagement.play },
    { key: "like", icon: Heart, value: post.engagement.like },
    { key: "comment", icon: MessageCircle, value: post.engagement.comment },
    { key: "save", icon: Bookmark, value: post.engagement.save },
    { key: "share", icon: Share2, value: post.engagement.share },
  ].filter((stat) => stat.value > 0);

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:border-blue-200 hover:shadow-md",
        view === "list"
          ? "grid gap-0 md:grid-cols-[280px_1fr]"
          : "flex flex-col",
      )}
    >
      <div className="absolute right-2 top-2 z-10">
        <DeleteButton postId={post.id} />
      </div>

      {firstMedia ? (
        <div
          className={cn(
            "relative aspect-[4/5] bg-slate-100",
            view === "list" ? "md:aspect-auto md:min-h-full" : "shrink-0",
          )}
        >
          {firstMedia.type === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt=""
              className="h-full w-full object-cover"
              src={proxiedImage(firstMedia.url)}
            />
          ) : (
            <video
              className="h-full w-full object-cover"
              src={firstMedia.url}
              controls
            />
          )}
        </div>
      ) : null}

      <div className="flex flex-1 flex-col gap-4 p-4">
        <header className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue-50 text-sm font-semibold text-blue-800">
              {post.authorName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-semibold text-slate-950">
                  {post.authorName}
                </p>
                {post.verified ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                ) : null}
              </div>
              <p className="truncate text-xs text-slate-500">
                @{post.authorHandle} · {formatDate(post.postedAt)}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {isCompetitor ? (
              <form action={removeCompetitorAction}>
                <input type="hidden" name="source" value={post.source} />
                <input type="hidden" name="handle" value={post.authorHandle} />
                <button
                  type="submit"
                  title="已加入競爭對手 · 撳取消"
                  aria-label="已加入競爭對手"
                  className="flex h-6 w-6 items-center justify-center rounded-md border border-blue-200 bg-blue-50 text-blue-800 transition hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-600"
                >
                  <UserCheck className="h-3.5 w-3.5" />
                </button>
              </form>
            ) : (
              <form action={addCompetitorAction}>
                <input type="hidden" name="source" value={post.source} />
                <input type="hidden" name="handle" value={post.authorHandle} />
                <input type="hidden" name="name" value={post.authorName} />
                <button
                  type="submit"
                  title="加入競爭對手"
                  aria-label="加入競爭對手"
                  className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                </button>
              </form>
            )}
            <Badge tone="muted" className="gap-1.5">
              <SourceIcon source={post.source} className="h-3.5 w-3.5" />
              {sourceLabels[post.source]}
            </Badge>
          </div>
        </header>

        {post.text ? (
          <a
            href={post.url ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="block transition hover:opacity-80"
            title="撳去睇原文 ↗"
          >
            {firstMedia ? (
            <p
              className={cn(
                "whitespace-pre-wrap break-words text-sm leading-6 text-slate-700",
                compact && "line-clamp-3 text-xs leading-5",
              )}
            >
              {post.text}
            </p>
          ) : (
            // Text-only posts (Threads / X): give the text a tinted quote panel with a
            // faint platform watermark so it reads as designed, not a plain block.
            <div
              className={cn(
                "relative overflow-hidden rounded-md border-l-2 bg-slate-50 p-2.5",
                accentBorder[post.source],
              )}
            >
              <SourceIcon
                source={post.source}
                className="absolute -right-1 -top-1 h-9 w-9 text-slate-200"
              />
              <p
                className={cn(
                  "relative whitespace-pre-wrap break-words text-slate-800",
                  compact
                    ? "line-clamp-4 text-xs leading-5"
                    : "text-sm leading-6",
                )}
              >
                {post.text}
              </p>
            </div>
            )}
          </a>
        ) : null}

        {stats.length ? (
          <div className="mt-auto flex flex-wrap items-center gap-3 text-xs text-slate-500">
            {stats.map(({ key, icon: Icon, value }) => (
              <span key={key} className="inline-flex items-center gap-1">
                <Icon className="h-3.5 w-3.5" />
                {formatNumber(value)}
              </span>
            ))}
          </div>
        ) : null}

        {actions ?? <CardActions post={post} />}
      </div>
    </article>
  );
}
