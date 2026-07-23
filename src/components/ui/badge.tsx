import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "default" | "muted" | "green" | "orange" | "blue";
};

const toneClasses: Record<NonNullable<BadgeProps["tone"]>, string> = {
  default: "border-zinc-700 bg-zinc-800 text-zinc-100",
  muted: "border-zinc-800 bg-zinc-900 text-zinc-400",
  green: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
  orange: "border-orange-500/30 bg-orange-500/10 text-orange-200",
  blue: "border-sky-500/30 bg-sky-500/10 text-blue-700",
};

export function Badge({ className, tone = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-md border px-2 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
