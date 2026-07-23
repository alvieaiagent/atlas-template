"use client";

import { useEffect, useState } from "react";
import { SOURCES, type Source } from "@/lib/types";
import { cn } from "@/lib/utils";

// Cookie (not localStorage) so the server can read it: /api/refresh uses these
// toggles to decide which sources a Force Refresh actually crawls.
export const SOURCE_COOKIE = "atlas-sources";

type SourceState = Record<Source, boolean>;

// Threads defaults OFF: igview-owner/threads-search-scraper bills from
// US$20/1,000 results — ~7x the X/IG search actors. It burned ~90% of the
// July 2026 Apify budget. Re-enable deliberately, not by default.
const defaultState: SourceState = {
  x: true,
  threads: false,
  ig: true,
  // YouTube / Facebook / web / note are Library-only (not part of the scraped
  // inspiration feed); keep the keys for type completeness — no toggle is rendered.
  youtube: true,
  facebook: true,
  web: true,
  note: true,
  xiaohongshu: true,
};

function readCookieState(): SourceState {
  const match = document.cookie.match(new RegExp(`(?:^|; )${SOURCE_COOKIE}=([^;]*)`));
  if (!match) {
    return defaultState;
  }
  try {
    const parsed = JSON.parse(decodeURIComponent(match[1])) as Partial<Record<Source, unknown>>;
    const bool = (key: Source) =>
      typeof parsed[key] === "boolean" ? (parsed[key] as boolean) : defaultState[key];
    return {
      x: bool("x"),
      threads: bool("threads"),
      ig: bool("ig"),
      youtube: bool("youtube"),
      facebook: bool("facebook"),
      web: bool("web"),
      note: bool("note"),
      xiaohongshu: bool("xiaohongshu"),
    };
  } catch {
    return defaultState;
  }
}

export function SourceToggles() {
  const [sources, setSources] = useState<SourceState>(defaultState);

  useEffect(() => {
    setSources(readCookieState());
  }, []);

  function toggleSource(source: Source) {
    setSources((current) => {
      const next = { ...current, [source]: !current[source] };
      document.cookie = `${SOURCE_COOKIE}=${encodeURIComponent(JSON.stringify(next))}; path=/; max-age=31536000; samesite=lax`;
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
                ? "border-blue-300 bg-blue-50 text-slate-950"
                : "border-slate-200 bg-white text-slate-500",
            )}
            onClick={() => toggleSource(source.source)}
            type="button"
          >
            <span>
              <span className="block text-sm font-bold">{source.label}</span>
              <span className={cn("text-xs", enabled ? "text-blue-700" : "text-slate-400")}>
                {enabled ? "Enabled" : "Disabled"}
              </span>
            </span>
            <span
              className={cn(
                "flex h-6 w-10 items-center rounded-full border p-0.5 transition",
                enabled ? "border-blue-600 bg-blue-600" : "border-slate-300 bg-slate-200",
              )}
            >
              <span
                className={cn(
                  "h-4 w-4 rounded-full bg-white shadow transition",
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
