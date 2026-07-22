"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Language } from "@/lib/language";

const options: { value: Language; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "yue", label: "廣東話" },
];

export function LanguageToggle({ language }: { language: Language }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const next = query ? `${pathname}?${query}` : pathname;

  return (
    <div className="grid grid-cols-2 gap-1 rounded-md border border-zinc-800 bg-zinc-950 p-1">
      {options.map((option) => (
        <a
          key={option.value}
          href={`/api/language?lang=${option.value}&next=${encodeURIComponent(next)}`}
          className={cn(
            "flex h-8 items-center justify-center rounded px-2 text-xs font-semibold transition",
            language === option.value
              ? "bg-sky-400 text-zinc-950"
              : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200",
          )}
        >
          {option.label}
        </a>
      ))}
    </div>
  );
}
