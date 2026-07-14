import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/database.types";
import { DEFAULT_CATEGORIES } from "../src/lib/default-categories";
import { getServerEnv } from "../src/lib/env";

// Non-destructive seed for hosted Supabase: upserts the 7 default categories by id.
// User-created categories keep their own ids and are never touched or deleted.
async function main(): Promise<void> {
  const env = getServerEnv();

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE) {
    console.error(
      "seed-defaults: SUPABASE_URL + SUPABASE_SERVICE_ROLE required in .env.local.",
    );
    process.exit(1);
  }

  const client = createClient<Database>(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE,
  );

  const rows = DEFAULT_CATEGORIES.map((category) => ({
    id: category.id,
    name: category.name,
    color: category.color,
    keywords: category.keywords,
    accounts: category.accounts,
    sort_order: category.sortOrder,
  }));

  const { error } = await client
    .from("categories")
    .upsert(rows, { onConflict: "id" });

  if (error) {
    console.error(`seed-defaults failed: ${error.message}`);
    process.exit(1);
  }

  console.log(
    `Seeded ${rows.length} default categories (non-destructive upsert by id).`,
  );
}

void main();
