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
          ? "border-blue-500 bg-blue-600 text-white"
          : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700",
      )}
      href={href}
    >
      {children}
    </Link>
  );
}
