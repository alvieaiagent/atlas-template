"use client";

import { useActionState, useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Copy, FileText, X } from "lucide-react";
import { grabScriptsAction } from "@/lib/actions";
import type { Post, ScriptsState } from "@/lib/types";
import { Button } from "@/components/ui/button";

const IDLE_SCRIPTS_STATE: ScriptsState = {
  ran: false,
  ok: false,
  caption: null,
  transcript: null,
  error: null,
};

function ScriptBlock({
  label,
  text,
  fallback,
}: {
  label: string;
  text: string | null;
  fallback: string;
}) {
  const [copied, setCopied] = useState(false);
  const value = text ?? "";

  return (
    <section className="mb-4">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          {label}
        </h3>
        {value ? (
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="inline-flex items-center gap-1 text-xs text-sky-300 transition hover:text-blue-700"
          >
            <Copy className="h-3 w-3" />
            {copied ? "已複製" : "複製"}
          </button>
        ) : null}
      </div>
      <pre className="whitespace-pre-wrap break-words rounded-md border border-zinc-800 bg-zinc-950 p-3 text-sm leading-6 text-zinc-200">
        {value || fallback}
      </pre>
    </section>
  );
}

export function ScriptsButton({ post }: { post: Post }) {
  const [state, formAction, pending] = useActionState(
    grabScriptsAction,
    IDLE_SCRIPTS_STATE,
  );
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (state.ran && state.ok) {
      setOpen(true);
    }
  }, [state]);

  return (
    <>
      <form action={formAction}>
        <input name="postPayload" type="hidden" value={JSON.stringify(post)} />
        <Button
          className="w-full"
          size="sm"
          type="submit"
          variant="ghost"
          disabled={pending}
        >
          <FileText className="h-4 w-4" />
          {pending ? "攞緊腳本…" : "腳本"}
        </Button>
      </form>

      {state.ran && !state.ok && state.error ? (
        <p className="text-[11px] text-amber-700">{state.error}</p>
      ) : null}

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[min(92vw,640px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900 p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <Dialog.Title className="text-base font-semibold text-zinc-50">
                腳本 · {post.authorName}
              </Dialog.Title>
              <Dialog.Close className="shrink-0 text-zinc-400 transition hover:text-zinc-100">
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>

            <ScriptBlock
              label="第一份 · Caption（帖文字）"
              text={state.caption}
              fallback="（冇 caption）"
            />
            <ScriptBlock
              label="第二份 · 逐字稿（Transcript）"
              text={state.transcript}
              fallback={state.error ?? "（冇逐字稿）"}
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
