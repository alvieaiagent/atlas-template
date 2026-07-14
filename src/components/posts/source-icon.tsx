import type { Source } from "@/lib/types";
import { cn } from "@/lib/utils";

const sourceLabel: Record<Source, string> = {
  x: "X",
  threads: "Threads",
  ig: "IG",
  youtube: "YouTube",
  facebook: "Facebook",
  web: "Web",
  note: "筆記",
  xiaohongshu: "小紅書",
};

/** Brand glyphs for X / Threads / IG / YouTube as inline SVG (lucide has no brand icons in v1). */
export function SourceIcon({
  source,
  className,
}: {
  source: Source;
  className?: string;
}) {
  const label = sourceLabel[source];
  const classes = cn("h-4 w-4", className);

  if (source === "x") {
    return (
      <svg role="img" aria-label={label} viewBox="0 0 24 24" fill="currentColor" className={classes}>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    );
  }

  if (source === "threads") {
    return (
      <svg role="img" aria-label={label} viewBox="0 0 24 24" fill="currentColor" className={classes}>
        <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.166 1.43 1.781 3.631 2.695 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.36-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291.539-.025 1.107-.014 1.665.06-.139-.831-.379-1.385-.74-1.706-.503-.448-1.29-.683-2.34-.683l-.18.01c-.621.029-1.51.09-2.146.49l-1.07-1.85c1.16-.706 2.7-.95 3.71-.99 1.96-.077 3.514.486 4.59 1.683.96 1.067 1.412 2.61 1.343 4.583l.11.06c1.16.69 2.01 1.62 2.535 2.808.745 1.69.781 4.45-1.48 6.66-1.733 1.694-3.832 2.463-6.798 2.485Z" />
      </svg>
    );
  }

  if (source === "youtube") {
    return (
      <svg role="img" aria-label={label} viewBox="0 0 24 24" fill="currentColor" className={classes}>
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    );
  }

  if (source === "facebook") {
    return (
      <svg role="img" aria-label={label} viewBox="0 0 24 24" fill="currentColor" className={classes}>
        <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.438H7.078v-3.49h3.047V9.414c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.49 0-1.956.931-1.956 1.887v2.263h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
      </svg>
    );
  }

  if (source === "web") {
    return (
      <svg role="img" aria-label={label} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={classes}>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
      </svg>
    );
  }

  if (source === "note") {
    return (
      <svg role="img" aria-label={label} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={classes}>
        <path d="M5 3h10l4 4v14H5z" />
        <path d="M15 3v4h4M8 12h8M8 16h6" />
      </svg>
    );
  }

  if (source === "xiaohongshu") {
    // Rounded-square book mark (小紅書 wordmark is text; use a simple book glyph).
    return (
      <svg role="img" aria-label={label} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={classes}>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <path d="M9 8v8M15 8v8M9 12h6" />
      </svg>
    );
  }

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={classes}
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
