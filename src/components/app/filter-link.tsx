import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type FilterLinkProps = {
  href: string;
  active: boolean;
  children: ReactNode;
};

export function FilterLink({ href, active, children }: FilterLinkProps) {
  return (
    <Link
      className={cn(
        "inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium transition",
        active
          ? "border-sky-400 bg-sky-400 text-zinc-950"
          : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-100",
      )}
      href={href}
    >
      {children}
    </Link>
  );
}
