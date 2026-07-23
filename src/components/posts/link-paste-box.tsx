"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Link2, FileText } from "lucide-react";
import { captureNoteAction, resolveLinkAction } from "@/lib/actions";
import { proxiedImage } from "@/lib/image-proxy";
import type { ResolveLinkState } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SourceIcon } from "@/components/posts/source-icon";

const IDLE_RESOLVE_STATE: ResolveLinkState = {
  ran: false,
  ok: false,
  message: null,
  persisted: false,
  preview: null,
};

type Mode = "link" | "note";

function formatViews(value: number): string {
  return new Intl.NumberFormat("en", {
    notation: value >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

export function LinkPasteBox({ initialUrl }: { initialUrl?: string }) {
  const [mode, setMode] = useState<Mode>("link");
  const [linkState, linkAction, linkPending] = useActionState(
    resolveLinkAction,
    IDLE_RESOLVE_STATE,
  );
  const [noteState, noteAction, notePending] = useActionState(
    captureNoteAction,
    IDLE_RESOLVE_STATE,
  );

  const state = mode === "link" ? linkState : noteState;
  const pending = mode === "link" ? linkPending : notePending;
  const preview = state.preview;

  // When opened via the iOS share-sheet shortcut (/library?add=<url>), auto-resolve
  // the shared link once so capture is a single tap with no extra paste/submit.
  const autoFired = useRef(false);
  useEffect(() => {
    if (initialUrl && !autoFired.current) {
      autoFired.current = true;
      const formData = new FormData();
      formData.set("url", initialUrl);
      linkAction(formData);
    }
  }, [initialUrl, linkAction]);

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-blue-100 bg-white p-4 shadow-sm">
      <div className="flex gap-1 self-start rounded-md border border-slate-200 bg-slate-50 p-0.5 text-xs">
        <button
          type="button"
          onClick={() => setMode("link")}
          className={cn(
            "flex items-center gap-1.5 rounded px-3 py-1.5 transition",
            mode === "link"
              ? "bg-blue-600 text-white"
              : "text-slate-500 hover:text-blue-700",
          )}
        >
          <Link2 className="h-3.5 w-3.5" />
          連結
        </button>
        <button
          type="button"
          onClick={() => setMode("note")}
          className={cn(
            "flex items-center gap-1.5 rounded px-3 py-1.5 transition",
            mode === "note"
              ? "bg-blue-600 text-white"
              : "text-slate-500 hover:text-blue-700",
          )}
        >
          <FileText className="h-3.5 w-3.5" />
          文字
        </button>
      </div>

      {mode === "link" ? (
        <form action={linkAction} className="flex flex-col gap-2 sm:flex-row">
          <Input
            name="url"
            inputMode="url"
            autoComplete="off"
            defaultValue={initialUrl}
            placeholder="貼 IG / Threads / X / FB / YouTube,或任何網站連結…"
          />
          <Button type="submit" disabled={pending} className="sm:w-auto">
            <Link2 className="h-4 w-4" />
            {pending ? "Resolving…" : "Add link"}
          </Button>
        </form>
      ) : (
        <form action={noteAction} className="flex flex-col gap-2">
          <textarea
            name="text"
            rows={4}
            placeholder="貼一段想 save 低嘅文字 / 筆記 / 靈感…"
            className="w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <Button type="submit" disabled={pending} className="self-end sm:w-auto">
            <FileText className="h-4 w-4" />
            {pending ? "Saving…" : "Save note"}
          </Button>
        </form>
      )}

      {pending ? (
        <p className="text-xs text-slate-500">
          {mode === "link"
            ? "Resolving the link — 社交 post 經 Apify 可能要 10–30s,網站連結快好多。"
            : "分析緊呢段文字…"}
        </p>
      ) : state.ran && state.message ? (
        <p
          className={cn(
            "text-xs",
            state.ok ? "text-emerald-700" : "text-amber-700",
          )}
        >
          {state.message}
        </p>
      ) : null}

      {preview ? (
        <PreviewCard preview={preview} />
      ) : null}
    </section>
  );
}

function PreviewCard({
  preview,
}: {
  preview: NonNullable<ResolveLinkState["preview"]>;
}) {
  const inner = (
    <>
      {preview.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          src={proxiedImage(preview.thumbnailUrl)}
          className="h-14 w-14 shrink-0 rounded object-cover"
        />
      ) : (
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-500">
          <SourceIcon source={preview.source} className="h-5 w-5" />
        </span>
      )}
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-sm font-bold text-slate-950">
          <SourceIcon source={preview.source} className="h-3.5 w-3.5" />
          <span className="truncate">{preview.authorName || preview.url || "筆記"}</span>
        </span>
        {preview.text ? (
          <span className="mt-0.5 line-clamp-2 block text-xs text-slate-600">
            {preview.text}
          </span>
        ) : null}
        {preview.views > 0 ? (
          <span className="mt-0.5 block text-xs text-slate-500">
            {formatViews(preview.views)} views
          </span>
        ) : null}
      </span>
    </>
  );

  const className =
    "flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 transition";

  // Notes have no URL — render a static panel instead of a dead link.
  return preview.url ? (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(className, "hover:border-blue-200")}
    >
      {inner}
    </a>
  ) : (
    <div className={className}>{inner}</div>
  );
}
