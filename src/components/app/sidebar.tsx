"use client";

import {
  Archive,
  BookOpen,
  Gauge,
  Library,
  Lightbulb,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LanguageToggle } from "@/components/app/language-toggle";
import type { Language } from "@/lib/language";
import { cn } from "@/lib/utils";

const navItems: Record<Language, { href: string; label: string; icon: typeof Gauge }[]> = {
  en: [
    { href: "/", label: "Today", icon: Gauge },
    { href: "/inspiration", label: "Signals", icon: Lightbulb },
    { href: "/learnings", label: "Daily Learnings", icon: BookOpen },
    { href: "/library", label: "Knowledge Bank", icon: Library },
    { href: "/archive", label: "Archive", icon: Archive },
    { href: "/competitors", label: "People / Watchlist", icon: Users },
    { href: "/settings", label: "Settings", icon: Settings },
  ],
  yue: [
    { href: "/", label: "今日", icon: Gauge },
    { href: "/inspiration", label: "Signals", icon: Lightbulb },
    { href: "/learnings", label: "每日學習", icon: BookOpen },
    { href: "/library", label: "Knowledge Bank", icon: Library },
    { href: "/archive", label: "Archive", icon: Archive },
    { href: "/competitors", label: "People / Watchlist", icon: Users },
    { href: "/settings", label: "設定", icon: Settings },
  ],
};

export function Sidebar({ language }: { language: Language }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-full flex-col border-r border-slate-200 bg-white text-slate-950">
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-600 text-white">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-950">Atlas V2</p>
          <p className="text-xs text-slate-500">Strategic Intelligence</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navItems[language].map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/" || pathname === "/today"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-blue-50 hover:text-blue-700",
                active && "bg-blue-50 text-blue-700 ring-1 ring-blue-100",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-3">
        <LanguageToggle language={language} />
        <p className="mt-3 text-xs text-slate-500">Janice-only briefings · no sub-agent POVs</p>
      </div>
    </aside>
  );
}
