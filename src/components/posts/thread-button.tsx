"use client";

import { useActionState, useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Copy, Sparkles, X } from "lucide-react";
import { generateOutputAction } from "@/lib/actions";
import type { GenerateState, Post } from "@/lib/types";
import { Button } from "@/components/ui/button";

const IDLE_GENERATE_STATE: GenerateState = {
  ran: false,
  ok: false,
  purpose: null,
  content: null,
  error: null,
};

// Twitter→Thread column action: turn a scraped X post into a paste-ready HK
// Cantonese Threads post via Gemini. Reuses generateOutputAction with
// outputKind="thread" (cached in post_outputs by kind).
export function ThreadButton({ post }: { post: Post }) {
  const [state, formAction, pending] = useActionState(
    generateOutputAction,
    IDLE_GENERATE_STATE,
  );
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (state.ran && state.ok) {
      setOpen(true);
    }
  }, [state]);

  return (
    <div className="flex flex-col gap-2">
      <form action={formAction}>
        <input name="postPayload" type="hidden" value={JSON.stringify(post)} />
        <input name="outputKind" type="hidden" value="thread" />
        <Button
          className="w-full"
          size="sm"
          type="submit"
          variant="secondary"
          disabled={pending}
        >
          <Sparkles className="h-4 w-4" />
          {pending ? "生成中…" : "✨ 出 Thread"}
        </Button>
      </form>

      {state.ran && !state.ok && state.error ? (
        <p className="text-[11px] text-amber-700">{state.error}</p>
      ) : null}

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[min(92vw,680px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900 p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <Dialog.Title className="text-base font-semibold text-zinc-50">
                Thread · {post.authorName}
              </Dialog.Title>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (state.content) {
                      navigator.clipboard.writeText(state.content);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }
                  }}
                  className="inline-flex items-center gap-1 text-xs text-sky-300 transition hover:text-blue-700"
                >
                  <Copy className="h-3 w-3" />
                  {copied ? "已複製" : "複製"}
                </button>
                <Dialog.Close className="text-zinc-400 transition hover:text-zinc-100">
                  <X className="h-4 w-4" />
                </Dialog.Close>
              </div>
            </div>
            <pre className="whitespace-pre-wrap break-words rounded-md border border-zinc-800 bg-zinc-950 p-3 text-sm leading-6 text-zinc-200">
              {state.content ?? ""}
            </pre>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
