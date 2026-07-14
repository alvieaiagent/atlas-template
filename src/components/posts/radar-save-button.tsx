"use client";

import { Bookmark } from "lucide-react";
import { toggleRadarSave } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import type { Post } from "@/lib/types";

// 「收藏」toggle for AI Radar cards. Saved (marked) items persist in the 收藏 tab;
// unsaved items age out of the ephemeral 最新 feed. Lightweight — no 用途 tagging.
export function RadarSaveButton({ post }: { post: Post }) {
  return (
    <form action={toggleRadarSave} className="w-full">
      <input type="hidden" name="postId" value={post.id} />
      <input type="hidden" name="saved" value={post.marked ? "1" : "0"} />
      <Button
        type="submit"
        variant={post.marked ? "secondary" : "ghost"}
        size="sm"
        className="w-full"
        title={post.marked ? "已收藏 · 撳一下取消" : "收藏留底"}
      >
        <Bookmark className={`h-4 w-4 ${post.marked ? "fill-current" : ""}`} />
        {post.marked ? "已收藏" : "收藏"}
      </Button>
    </form>
  );
}
