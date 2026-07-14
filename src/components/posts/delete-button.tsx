"use client";

import { Trash2 } from "lucide-react";
import { deletePostAction } from "@/lib/actions";

export function DeleteButton({ postId }: { postId: string }) {
  return (
    <form
      action={deletePostAction}
      onSubmit={(event) => {
        if (!confirm("刪除呢張卡?")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="postId" value={postId} />
      <button
        type="submit"
        aria-label="刪除"
        className="flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-zinc-300 backdrop-blur transition hover:bg-red-500/80 hover:text-white"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </form>
  );
}
