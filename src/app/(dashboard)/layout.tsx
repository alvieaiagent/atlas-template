import { MockModeBanner } from "@/components/app/mock-mode-banner";
import { Sidebar } from "@/components/app/sidebar";
import { logFeatureStatusOnce } from "@/lib/env";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const featureStatus = logFeatureStatusOnce();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[240px_1fr]">
        <div className="hidden md:block">
          <Sidebar />
        </div>
        <div className="flex min-w-0 flex-col">
          <div className="border-b border-zinc-850 bg-zinc-950 md:hidden">
            <Sidebar />
          </div>
          {!featureStatus.supabase ? <MockModeBanner /> : null}
          {children}
        </div>
      </div>
    </div>
  );
}
