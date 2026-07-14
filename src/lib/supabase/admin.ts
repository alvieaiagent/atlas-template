import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { getServerEnv } from "@/lib/env";

export function createSupabaseAdminClient() {
  const env = getServerEnv();

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE) {
    return null;
  }

  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
