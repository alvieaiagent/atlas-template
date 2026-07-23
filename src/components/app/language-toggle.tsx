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
    <div className="grid grid-cols-2 gap-1 rounded-md border border-slate-200 bg-slate-50 p-1">
      {options.map((option) => (
        <a
          key={option.value}
          href={`/api/language?lang=${option.value}&next=${encodeURIComponent(next)}`}
          className={cn(
            "flex min-h-8 items-center justify-center rounded px-2 text-xs font-bold transition",
            language === option.value
              ? "bg-blue-600 text-white"
              : "text-slate-600 hover:bg-blue-50 hover:text-blue-700",
          )}
        >
          {option.label}
        </a>
      ))}
    </div>
  );
}
