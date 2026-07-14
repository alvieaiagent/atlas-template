import {
  getDegradedFeatureSummary,
  getFeatureStatus,
  getServerEnv,
} from "../src/lib/env";

const env = getServerEnv();
const status = getFeatureStatus(env);

const rows = [
  ["Supabase auth/CRUD/persistence", status.persistence, "SUPABASE_URL + SUPABASE_ANON_KEY"],
  ["Apify scraping", status.scraping, "APIFY_TOKEN + SUPABASE_SERVICE_ROLE"],
  ["Cron endpoint auth", status.cronSecret, "CRON_SECRET"],
  ["Gemini transcript (腳本 逐字稿)", status.transcribe, "GEMINI_API_KEY"],
] satisfies [string, boolean, string][];

console.log("Atlas env matrix");
console.log("----------------");

rows.forEach(([name, live, required]) => {
  console.log(`${live ? "LIVE " : "MOCK "} ${name} (${required})`);
});

console.log("----------------");
console.log(`Degraded: ${getDegradedFeatureSummary(status)}`);
