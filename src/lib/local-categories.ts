import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { mockCategories } from "@/lib/mock-data";
import type { Category } from "@/lib/types";

const storePath = join(process.cwd(), ".hermes", "local-categories.json");

type CategoryInput = {
  name: string;
  color: string;
  keywords: string[];
  accounts: string[];
  sortOrder?: number;
};

async function readStore(): Promise<Category[] | null> {
  try {
    return JSON.parse(await readFile(storePath, "utf8")) as Category[];
  } catch {
    return null;
  }
}

async function writeStore(categories: Category[]): Promise<void> {
  await mkdir(join(process.cwd(), ".hermes"), { recursive: true });
  await writeFile(storePath, `${JSON.stringify(categories, null, 2)}\n`);
}

export async function getLocalCategories(): Promise<Category[]> {
  return (await readStore()) ?? mockCategories;
}

export async function createLocalCategory(input: CategoryInput): Promise<void> {
  const categories = await getLocalCategories();
  categories.push({
    id: randomUUID(),
    name: input.name,
    color: input.color,
    keywords: input.keywords,
    accounts: input.accounts,
    sortOrder: input.sortOrder ?? categories.length + 1,
    createdAt: new Date().toISOString(),
  });
  await writeStore(categories);
}

export async function updateLocalCategory(id: string, input: CategoryInput): Promise<void> {
  const categories = await getLocalCategories();
  await writeStore(categories.map((category) => category.id === id ? { ...category, ...input, sortOrder: input.sortOrder ?? category.sortOrder } : category));
}

export async function deleteLocalCategory(id: string): Promise<void> {
  await writeStore((await getLocalCategories()).filter((category) => category.id !== id));
}
