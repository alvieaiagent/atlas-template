"use client";

import { useEffect, useState } from "react";
import { SOURCES, type Source } from "@/lib/types";
import { cn } from "@/lib/utils";

const storageKey = "atlas-source-settings";

type SourceState = Record<Source, boolean>;

const defaultState: SourceState = {
  x: true,
  threads: true,
  ig: true,
  // YouTube / Facebook / web / note are Library-only (not part of the scraped
  // inspiration feed); keep the keys for type completeness — no toggle is rendered.
  youtube: true,
  facebook: true,
  web: true,
  note: true,
  xiaohongshu: true,
};

function readStoredState(): SourceState {
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    return defaultState;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<Record<Source, unknown>>;
    return {
      x: typeof parsed.x === "boolean" ? parsed.x : true,
      threads: typeof parsed.threads === "boolean" ? parsed.threads : true,
      ig: typeof parsed.ig === "boolean" ? parsed.ig : true,
      youtube: typeof parsed.youtube === "boolean" ? parsed.youtube : true,
      facebook: typeof parsed.facebook === "boolean" ? parsed.facebook : true,
      web: typeof parsed.web === "boolean" ? parsed.web : true,
      note: typeof parsed.note === "boolean" ? parsed.note : true,
      xiaohongshu:
        typeof parsed.xiaohongshu === "boolean" ? parsed.xiaohongshu : true,
    };
  } catch {
    return defaultState;
  }
}

export function SourceToggles() {
  const [sources, setSources] = useState<SourceState>(defaultState);

  useEffect(() => {
    setSources(readStoredState());
  }, []);

  function toggleSource(source: Source) {
    setSources((current) => {
      const next = { ...current, [source]: !current[source] };
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {SOURCES.map((source) => {
        const enabled = sources[source.source];

        return (
          <button
            key={source.source}
            className={cn(
              "flex h-16 items-center justify-between rounded-lg border px-4 text-left transition",
              enabled
                ? "border-sky-500/40 bg-sky-500/10 text-sky-100"
                : "border-zinc-800 bg-zinc-950 text-zinc-500",
            )}
            onClick={() => toggleSource(source.source)}
            type="button"
          >
            <span>
              <span className="block text-sm font-medium">{source.label}</span>
              <span className="text-xs">{enabled ? "Enabled" : "Disabled"}</span>
            </span>
            <span
              className={cn(
                "flex h-6 w-10 items-center rounded-full border p-0.5 transition",
                enabled
                  ? "border-sky-400 bg-sky-400"
                  : "border-zinc-700 bg-zinc-900",
              )}
            >
              <span
                className={cn(
                  "h-4 w-4 rounded-full bg-zinc-950 transition",
                  enabled && "translate-x-4",
                )}
              />
            </span>
          </button>
        );
      })}
    </div>
  );
}
