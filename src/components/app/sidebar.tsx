"use client";

import {
  Bookmark,
  Gauge,
  Library,
  Lightbulb,
  Radar,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: Gauge },
  { href: "/inspiration", label: "Inspiration", icon: Lightbulb },
  { href: "/radar", label: "AI Radar", icon: Radar },
  { href: "/marked", label: "Marked", icon: Bookmark },
  { href: "/library", label: "Library", icon: Library },
  { href: "/competitors", label: "競爭對手", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-full flex-col border-r border-zinc-850 bg-zinc-950">
      <div className="flex h-16 items-center gap-3 border-b border-zinc-850 px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-sky-400 text-zinc-950">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-50">Atlas</p>
          <p className="text-xs text-zinc-500">Inspiration OS</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navItems.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-10 items-center gap-3 rounded-md px-3 text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-50",
                active && "bg-zinc-900 text-zinc-50",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-zinc-850 p-3 text-xs text-zinc-600">
        Atlas
      </div>
    </aside>
  );
}
