import { PURPOSES } from "@/lib/types";
import type { Purpose, Source, TimeFilter, ViewMode } from "@/lib/types";

const sourceValues: Source[] = ["x", "threads", "ig"];
const timeValues: TimeFilter[] = ["4h", "24h", "48h", "7d", "all"];
const viewValues: ViewMode[] = ["grid", "list"];

export type InspirationSearchParams = {
  category?: string;
  keyword?: string;
  time?: string;
  source?: string;
  view?: string;
  tab?: string;
  refresh?: string;
  errors?: string;
};

export function parseSources(value: string | undefined): Source[] {
  if (!value) {
    return [];
  }

  const result: Source[] = [];
  for (const part of value.split(",").map((item) => item.trim())) {
    const match = sourceValues.find((source) => source === part);
    if (match && !result.includes(match)) {
      result.push(match);
    }
  }

  return result;
}

/** Add/remove a source from the active multi-select; returns the comma param (or undefined = all). */
export function toggleSource(
  current: Source[],
  source: Source,
): string | undefined {
  const next = current.includes(source)
    ? current.filter((item) => item !== source)
    : [...current, source];

  return next.length ? next.join(",") : undefined;
}

export function parseTime(value: string | undefined): TimeFilter {
  return timeValues.find((time) => time === value) ?? "24h";
}

export function parseView(value: string | undefined): ViewMode {
  return viewValues.find((view) => view === value) ?? "grid";
}

export function buildHref(
  params: InspirationSearchParams,
  updates: InspirationSearchParams,
): string {
  const next = new URLSearchParams();
  const merged: InspirationSearchParams = { ...params, ...updates };

  Object.entries(merged).forEach(([key, value]) => {
    if (value) {
      next.set(key, value);
    }
  });

  const query = next.toString();
  return query ? `/inspiration?${query}` : "/inspiration";
}

export function parsePurpose(value: string | undefined): Purpose | undefined {
  return PURPOSES.map((purpose) => purpose.value).find(
    (purpose) => purpose === value,
  );
}

export function buildLibraryHref(purpose: string | undefined): string {
  return purpose ? `/library?purpose=${purpose}` : "/library";
}
