"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Copy, Sparkles, X } from "lucide-react";
import { generateOutputAction, setPurposeAction } from "@/lib/actions";
import { PURPOSES, type GenerateState, type Post, type Purpose } from "@/lib/types";
import { Button } from "@/components/ui/button";

const IDLE_GENERATE_STATE: GenerateState = {
  ran: false,
  ok: false,
  purpose: null,
  content: null,
  error: null,
};

const GENERATE_LABEL: Record<Purpose, string> = {
  reel: "生成 Reel 腳本",
  carousel: "生成 Carousel 指令包",
  cheatsheet: "生成 攻略圖 指令包",
  swipe: "生成 Swipe 拆解",
  research: "生成學習筆記",
  business: "商業角度（route）",
  inbox: "揀返用途先生成",
};

export function PurposeBar({ post }: { post: Post }) {
  const purposeFormRef = useRef<HTMLFormElement>(null);
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

  const canGenerate = post.purpose !== "inbox" && post.purpose !== "business";

  return (
    <div className="flex flex-col gap-2">
      <form
        ref={purposeFormRef}
        action={setPurposeAction}
        className="flex items-center gap-2"
      >
        <input type="hidden" name="postId" value={post.id} />
        <span className="text-[11px] text-zinc-500">用途</span>
        <select
          name="purpose"
          defaultValue={post.purpose}
          onChange={() => purposeFormRef.current?.requestSubmit()}
          className="h-7 flex-1 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-blue-400"
        >
          {PURPOSES.map((purpose) => (
            <option key={purpose.value} value={purpose.value}>
              {purpose.label}
            </option>
          ))}
        </select>
      </form>

      <form action={formAction}>
        <input name="postPayload" type="hidden" value={JSON.stringify(post)} />
        <Button
          className="w-full"
          size="sm"
          type="submit"
          variant="secondary"
          disabled={pending || !canGenerate}
        >
          <Sparkles className="h-4 w-4" />
          {pending ? "生成中…" : canGenerate ? "✨ 生成" : "揀返用途先生成"}
        </Button>
      </form>

      {state.ran && !state.ok && state.error ? (
        <p className="text-[11px] text-blue-800">{state.error}</p>
      ) : null}

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[min(92vw,680px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <Dialog.Title className="text-base font-semibold text-slate-950">
                {GENERATE_LABEL[state.purpose ?? post.purpose]} · {post.authorName}
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
                  className="inline-flex items-center gap-1 text-xs text-blue-700 transition hover:text-blue-900"
                >
                  <Copy className="h-3 w-3" />
                  {copied ? "已複製" : "複製"}
                </button>
                <Dialog.Close className="text-slate-500 transition hover:text-slate-950">
                  <X className="h-4 w-4" />
                </Dialog.Close>
              </div>
            </div>
            <pre className="whitespace-pre-wrap break-words rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-800">
              {state.content ?? ""}
            </pre>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
