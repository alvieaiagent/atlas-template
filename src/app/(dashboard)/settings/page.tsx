import { Plus, Save, Trash2 } from "lucide-react";
import { SourceToggles } from "@/components/app/source-toggles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/lib/actions";
import { getCategories } from "@/lib/data";

export default async function SettingsPage() {
  const categories = await getCategories();

  return (
    <main className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
      <header>
        <p className="text-sm text-zinc-500">Configure sources and categories</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-normal text-zinc-50">
          Settings
        </h1>
      </header>

      <section className="rounded-lg border border-zinc-850 bg-zinc-900 p-4">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-zinc-50">Data sources</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Toggle the sources you want Atlas to consider for refresh jobs.
          </p>
        </div>
        <SourceToggles />
      </section>

      <section className="rounded-lg border border-zinc-850 bg-zinc-900 p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-50">
              Categories
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Keywords and accounts are comma-separated.
            </p>
          </div>
        </div>

        <form
          action={createCategory}
          className="mb-5 grid gap-3 rounded-lg border border-zinc-850 bg-zinc-950 p-3 md:grid-cols-[1fr_1fr_1fr_88px_96px]"
        >
          <Input name="name" placeholder="Category name" />
          <Input name="keywords" placeholder="keywords[]" />
          <Input name="accounts" placeholder="accounts[]" />
          <Input name="color" type="color" defaultValue="#38bdf8" />
          <Button type="submit">
            <Plus className="h-4 w-4" />
            Add
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
                  Save
                </Button>
              </form>
              <form action={deleteCategory} className="mt-3">
                <input name="id" type="hidden" value={category.id} />
                <Button size="sm" type="submit" variant="ghost">
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </form>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
