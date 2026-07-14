import { ApifyClient } from "apify-client";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  actorBySource,
  buildActorInput,
} from "../src/lib/scraping/apify";
import type { Source } from "../src/lib/types";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

const sources: Source[] = ["x", "threads", "ig"];
const query = '"claude code" OR "anthropic" OR from:anthropicai';
const here = dirname(fileURLToPath(import.meta.url));
const fixtureDir = join(here, "../src/lib/scraping/__fixtures__");

function toJsonValue(value: unknown, depth = 0): JsonValue {
  if (value === null) {
    return null;
  }

  if (typeof value === "string") {
    return value.length > 500 ? `${value.slice(0, 500)}...` : value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    if (depth >= 3) {
      return [];
    }

    return value.slice(0, 5).map((item) => toJsonValue(item, depth + 1));
  }

  if (typeof value === "object") {
    if (depth >= 3) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 40)
        .map(([key, item]) => [key, toJsonValue(item, depth + 1)]),
    );
  }

  return null;
}

async function main() {
  const token = process.env.APIFY_TOKEN;

  if (!token) {
    throw new Error("APIFY_TOKEN is required. It is read from the environment and never written to disk.");
  }

  await mkdir(fixtureDir, { recursive: true });

  const client = new ApifyClient({ token });

  for (const source of sources) {
    console.log(`Sampling ${source} via ${actorBySource[source]}...`);
    const run = await client
      .actor(actorBySource[source])
      .call(buildActorInput(source, query, null));

    if (!run.defaultDatasetId) {
      console.warn(`No dataset returned for ${source}.`);
      continue;
    }

    const dataset = await client.dataset(run.defaultDatasetId).listItems({ limit: 5 });
    const trimmed = dataset.items.map((item) => toJsonValue(item));
    const filePath = join(fixtureDir, `${source}.sample.json`);
    await writeFile(filePath, `${JSON.stringify(trimmed, null, 2)}\n`);
    console.log(`Wrote ${filePath}`);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown sample error";
  console.error(message);
  process.exitCode = 1;
});
