"use client";

import { useActionState, useState } from "react";
import { Bookmark, Check, Link2, X } from "lucide-react";
import { markPostAction, toggleUsedAction, unmarkPost } from "@/lib/actions";
import { getPostUrl } from "@/lib/post-url";
import type { DestinationState, MarkState, Post, Purpose } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PurposeBar } from "@/components/posts/purpose-bar";

const IDLE_MARK_STATE: MarkState = {
  ran: false,
  supabase: "skipped",
  error: null,
};

// Mark a post AS one of your three content formats; this also tags the 用途.
const MARK_TYPES: { purpose: Purpose; label: string }[] = [
  { purpose: "carousel", label: "Carousel" },
  { purpose: "reel", label: "Reel" },
  { purpose: "cheatsheet", label: "攻略圖" },
];

const MARKED_LABEL: Partial<Record<Purpose, string>> = {
  carousel: "Carousel",
  reel: "Reel",
  cheatsheet: "一頁攻略圖",
};

const destStyles: Record<DestinationState, { icon: string; className: string }> = {
  ok: { icon: "✓", className: "text-emerald-300" },
  failed: { icon: "⚠", className: "text-amber-300" },
  skipped: { icon: "–", className: "text-zinc-600" },
};

function DestinationDot({
  label,
  state,
}: {
  label: string;
  state: DestinationState;
}) {
  const style = destStyles[state];

  return (
    <span className={cn("inline-flex items-center gap-1", style.className)}>
      <span aria-hidden>{style.icon}</span>
      {label}
    </span>
  );
}

export function CardActions({ post }: { post: Post }) {
  const [state, formAction, pending] = useActionState(
    markPostAction,
    IDLE_MARK_STATE,
  );
  const captureUrl = getPostUrl(post);
  const [copiedUrl, setCopiedUrl] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      {post.marked ? (
        <form action={unmarkPost}>
          <input name="postId" type="hidden" value={post.id} />
          <Button
            className="group w-full border-amber-400/50 bg-amber-400/15 text-amber-200 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-200"
            size="sm"
            type="submit"
            variant="outline"
            title="已收藏做素材 · 撳一下取消"
          >
            <Bookmark className="h-4 w-4 fill-current group-hover:hidden" />
            <X className="hidden h-4 w-4 group-hover:block" />
            <span className="group-hover:hidden">
              已 Mark · {MARKED_LABEL[post.purpose] ?? "素材"}
            </span>
            <span className="hidden group-hover:inline">取消 Mark</span>
          </Button>
        </form>
      ) : (
        <>
          <p className="text-[11px] text-zinc-500">Mark 做素材：</p>
          <div className="grid grid-cols-3 gap-1.5">
            {MARK_TYPES.map((type) => (
              <form key={type.purpose} action={formAction}>
                <input
                  name="postPayload"
                  type="hidden"
                  value={JSON.stringify(post)}
                />
                <input name="purpose" type="hidden" value={type.purpose} />
                <Button
                  className="w-full px-1 text-[11px]"
                  size="sm"
                  type="submit"
                  variant="secondary"
                  disabled={pending}
                >
                  {type.label}
                </Button>
              </form>
            ))}
          </div>

          {state.ran ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
              <DestinationDot label="Supabase" state={state.supabase} />
            </div>
          ) : null}
        </>
      )}

      <div className="flex gap-1.5">
        {captureUrl ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="flex-1"
            onClick={() => {
              navigator.clipboard.writeText(captureUrl);
              setCopiedUrl(true);
              setTimeout(() => setCopiedUrl(false), 1500);
            }}
          >
            <Link2 className="h-4 w-4" />
            {copiedUrl ? "已複製" : "連結"}
          </Button>
        ) : null}

        {/* 已經使用：用完一個內容就 mark 低,一眼睇到邊啲仲未用 */}
        <form action={toggleUsedAction} className="flex-1">
          <input name="postId" type="hidden" value={post.id} />
          <input name="used" type="hidden" value={post.used ? "0" : "1"} />
          <Button
            type="submit"
            size="sm"
            variant={post.used ? "outline" : "ghost"}
            className={cn(
              "w-full",
              post.used &&
                "border-emerald-400/50 bg-emerald-400/15 text-emerald-200 hover:bg-emerald-400/25",
            )}
            title={post.used ? "已使用過 · 撳一下取消" : "標記為已使用"}
          >
            <Check className="h-4 w-4" />
            {post.used ? "已使用" : "標記已用"}
          </Button>
        </form>
      </div>

      <PurposeBar post={post} />
    </div>
  );
}
