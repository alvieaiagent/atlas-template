import { z } from "zod";

const serverEnvSchema = z.object({
  APIFY_TOKEN: z.string().min(1).optional(),
  SCRAPECREATORS_API_KEY: z.string().min(1).optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE: z.string().min(1).optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  CRON_SECRET: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().min(1).optional(),
  FACEBOOK_APIFY_ACTOR: z.string().min(1).optional(),
  FACEBOOK_OEMBED_ACCESS_TOKEN: z.string().min(1).optional(),
  FACEBOOK_APP_ID: z.string().min(1).optional(),
  FACEBOOK_CLIENT_TOKEN: z.string().min(1).optional(),
  FACEBOOK_GRAPH_VERSION: z.string().min(1).optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export type FeatureStatus = {
  supabase: boolean;
  apify: boolean;
  cronSecret: boolean;
  persistence: boolean;
  scraping: boolean;
  transcribe: boolean;
};

declare global {
  var __atlasFeatureStatusLogged: boolean | undefined;
}

export function getServerEnv(): ServerEnv {
  return serverEnvSchema.parse({
    APIFY_TOKEN: process.env.APIFY_TOKEN,
    SCRAPECREATORS_API_KEY: process.env.SCRAPECREATORS_API_KEY,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE: process.env.SUPABASE_SERVICE_ROLE,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    CRON_SECRET: process.env.CRON_SECRET,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    FACEBOOK_APIFY_ACTOR: process.env.FACEBOOK_APIFY_ACTOR,
    FACEBOOK_OEMBED_ACCESS_TOKEN: process.env.FACEBOOK_OEMBED_ACCESS_TOKEN,
    FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID,
    FACEBOOK_CLIENT_TOKEN: process.env.FACEBOOK_CLIENT_TOKEN,
    FACEBOOK_GRAPH_VERSION: process.env.FACEBOOK_GRAPH_VERSION,
  });
}

export function hasSupabaseEnv(env: ServerEnv = getServerEnv()): boolean {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY);
}

export function hasServiceRoleEnv(env: ServerEnv = getServerEnv()): boolean {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE);
}

export function getFeatureStatus(env: ServerEnv = getServerEnv()): FeatureStatus {
  const supabase = hasSupabaseEnv(env);
  const serviceRole = hasServiceRoleEnv(env);
  const apify = Boolean(env.APIFY_TOKEN);

  return {
    supabase,
    apify,
    cronSecret: Boolean(env.CRON_SECRET),
    persistence: supabase,
    scraping: serviceRole && apify,
    transcribe: Boolean(env.GEMINI_API_KEY),
  };
}

export function getDegradedFeatureSummary(status: FeatureStatus): string {
  const degraded: string[] = [];

  if (!status.persistence) {
    degraded.push("Supabase auth/CRUD/persistence");
  }

  if (!status.scraping) {
    degraded.push("Apify scraping");
  }

  if (!status.cronSecret) {
    degraded.push("cron auth secret");
  }

  if (!status.transcribe) {
    degraded.push("Gemini transcript");
  }

  return degraded.length ? degraded.join(", ") : "none";
}

export function logFeatureStatusOnce(): FeatureStatus {
  const status = getFeatureStatus();

  if (!globalThis.__atlasFeatureStatusLogged) {
    console.info(
      `[Atlas] feature status: Supabase=${status.supabase ? "live" : "mock"}; Apify=${
        status.scraping ? "live" : "disabled"
      }; degraded=${getDegradedFeatureSummary(status)}`,
    );
    globalThis.__atlasFeatureStatusLogged = true;
  }

  return status;
}
