import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Competitor, Source } from "@/lib/types";

const storePath = join(process.cwd(), ".hermes", "local-watchlist.json");

async function readStore(): Promise<Competitor[]> {
  try {
    return JSON.parse(await readFile(storePath, "utf8")) as Competitor[];
  } catch {
    return [];
  }
}

async function writeStore(items: Competitor[]): Promise<void> {
  await mkdir(join(process.cwd(), ".hermes"), { recursive: true });
  await writeFile(storePath, `${JSON.stringify(items, null, 2)}\n`);
}

export async function getLocalCompetitors(): Promise<Competitor[]> {
  return readStore();
}

export async function upsertLocalCompetitor(input: { source: Source; handle: string; name?: string | null }): Promise<void> {
  const items = await readStore();
  const handle = input.handle.replace(/^@/, "");
  const index = items.findIndex((item) => item.source === input.source && item.handle.toLowerCase() === handle.toLowerCase());
  const competitor: Competitor = {
    source: input.source,
    handle,
    name: input.name || handle,
    addedAt: new Date().toISOString(),
  };
  if (index >= 0) {
    items[index] = { ...items[index], ...competitor };
  } else {
    items.unshift(competitor);
  }
  await writeStore(items);
}

export async function removeLocalCompetitor(source: Source, handle: string): Promise<void> {
  const clean = handle.replace(/^@/, "").toLowerCase();
  await writeStore((await readStore()).filter((item) => !(item.source === source && item.handle.toLowerCase() === clean)));
}
