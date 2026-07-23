import { MockModeBanner } from "@/components/app/mock-mode-banner";
import { Sidebar } from "@/components/app/sidebar";
import { TodayPageContent } from "@/components/app/today-page-content";
import { logFeatureStatusOnce } from "@/lib/env";
import { getLanguage } from "@/lib/language";

export default async function RootTodayPage() {
  const featureStatus = logFeatureStatusOnce();
  const language = await getLanguage();

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[240px_1fr]">
        <div className="hidden md:block">
          <Sidebar language={language} />
        </div>
        <div className="flex min-w-0 flex-col bg-slate-50">
          <div className="border-b border-slate-200 bg-white md:hidden">
            <Sidebar language={language} />
          </div>
          {!featureStatus.supabase ? <MockModeBanner /> : null}
          <TodayPageContent />
        </div>
      </div>
    </div>
  );
}
