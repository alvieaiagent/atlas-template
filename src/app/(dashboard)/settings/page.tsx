import { Plus, Save, Trash2 } from "lucide-react";
import { SourceToggles } from "@/components/app/source-toggles";
import { UsageGuide } from "@/components/app/usage-guide";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/lib/actions";
import { getCategories } from "@/lib/data";
import { getLanguage, pick } from "@/lib/language";

export default async function SettingsPage() {
  const language = await getLanguage();
  const copy = pick(language, {
    en: {
      eyebrow: "Configure sources and categories",
      title: "Settings",
      guideTitle: "Settings = control what Atlas watches.",
      guideDescription: "Use Settings when the feed feels noisy, empty, or off-strategy. Sources decide where Atlas collects from; categories decide what topics and accounts it should care about.",
      sourcesTitle: "Turn platforms on/off",
      sourcesBody: "Enable X / Threads / IG depending on the content format you want to study this week.",
      categoriesTitle: "Define your topic lanes",
      categoriesBody: "Each category should represent a content lane such as Prompt Engineering, AI Video, Carousel Inspiration, or IG Story funnel.",
      keywordsTitle: "Write search terms like briefs",
      keywordsBody: "Use specific keywords and accounts. Broad keywords create noise; precise keywords make the feed useful.",
      tip: "When the feed is bad, fix Settings first. More scraping will not help if the keywords and accounts are weak.",
      dataSources: "Data sources",
      dataSourcesBody: "Toggle the sources you want Atlas to consider for refresh jobs.",
      categories: "Categories",
      categoryHelp: "Keywords and accounts are comma-separated.",
      namePlaceholder: "Category name",
      keywordsPlaceholder: "keywords[]",
      accountsPlaceholder: "accounts[]",
      add: "Add",
      save: "Save",
      delete: "Delete",
    },
    yue: {
      eyebrow: "設定 sources 同 categories",
      title: "設定",
      guideTitle: "設定 = 控制 Atlas 要睇咩。",
      guideDescription: "當 feed 太嘈、太空、或者離題，就嚟 Settings。Sources 決定 Atlas 去邊度收集；categories 決定佢應該 care 咩 topic 同 accounts。",
      sourcesTitle: "開/關平台來源",
      sourcesBody: "按你今個星期想研究嘅內容格式，開 X / Threads / IG。",
      categoriesTitle: "定義你嘅 topic lanes",
      categoriesBody: "每個 category 應該係一條內容路線，例如 Prompt Engineering、AI Video、Carousel Inspiration、IG Story 漏斗。",
      keywordsTitle: "Keywords 要似 brief 咁寫",
      keywordsBody: "用具體 keywords 同 accounts。太闊會變 noise；越精準，feed 越有用。",
      tip: "Feed 唔好，先修 Settings。Keywords/accounts 弱，scrape 多啲都冇用。",
      dataSources: "資料來源",
      dataSourcesBody: "開關你想 Atlas refresh 時考慮嘅 sources。",
      categories: "分類",
      categoryHelp: "Keywords 同 accounts 用 comma 分隔。",
      namePlaceholder: "分類名稱",
      keywordsPlaceholder: "keywords[]",
      accountsPlaceholder: "accounts[]",
      add: "新增",
      save: "儲存",
      delete: "刪除",
    },
  });
  const categories = await getCategories();

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
      <header>
        <p className="text-sm text-zinc-500">{copy.eyebrow}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-normal text-zinc-50">
          {copy.title}
        </h1>
      </header>

      <UsageGuide
        title={copy.guideTitle}
        description={copy.guideDescription}
        steps={[
          {
            label: "Sources",
            title: copy.sourcesTitle,
            body: copy.sourcesBody,
          },
          {
            label: "Categories",
            title: copy.categoriesTitle,
            body: copy.categoriesBody,
          },
          {
            label: "Keywords",
            title: copy.keywordsTitle,
            body: copy.keywordsBody,
          },
        ]}
        tip={copy.tip}
      />

      <section className="rounded-lg border border-zinc-850 bg-zinc-900 p-4">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-zinc-50">{copy.dataSources}</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {copy.dataSourcesBody}
          </p>
        </div>
        <SourceToggles />
      </section>

      <section className="rounded-lg border border-zinc-850 bg-zinc-900 p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-50">
              {copy.categories}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {copy.categoryHelp}
            </p>
          </div>
        </div>

        <form
          action={createCategory}
          className="mb-5 grid gap-3 rounded-lg border border-zinc-850 bg-zinc-950 p-3 md:grid-cols-[1fr_1fr_1fr_88px_96px]"
        >
          <Input name="name" placeholder={copy.namePlaceholder} />
          <Input name="keywords" placeholder={copy.keywordsPlaceholder} />
          <Input name="accounts" placeholder={copy.accountsPlaceholder} />
          <Input name="color" type="color" defaultValue="#38bdf8" />
          <Button type="submit">
            <Plus className="h-4 w-4" />
            {copy.add}
          </Button>
        </form>

        <div className="space-y-3">
          {categories.map((category) => (
            <div
              key={category.id}
              className="rounded-lg border border-zinc-850 bg-zinc-950 p-3"
            >
              <form
                action={updateCategory}
                className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_88px_84px]"
              >
                <input name="id" type="hidden" value={category.id} />
                <Input name="name" defaultValue={category.name} />
                <Input
                  name="keywords"
                  defaultValue={category.keywords.join(", ")}
                />
                <Input
                  name="accounts"
                  defaultValue={category.accounts.join(", ")}
                />
                <Input name="color" type="color" defaultValue={category.color} />
                <Button type="submit" variant="secondary">
                  <Save className="h-4 w-4" />
                  {copy.save}
                </Button>
              </form>
              <form action={deleteCategory} className="mt-3">
                <input name="id" type="hidden" value={category.id} />
                <Button size="sm" type="submit" variant="ghost">
                  <Trash2 className="h-4 w-4" />
                  {copy.delete}
                </Button>
              </form>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
