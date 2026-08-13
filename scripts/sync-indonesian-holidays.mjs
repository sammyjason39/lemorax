import { createClient } from "@supabase/supabase-js";
import { fetchIndonesianHolidays } from "../lib/holidays/api-co-id.mjs";
import { loadEnvLocal } from "./lib/vault-seed-shared.mjs";

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const yearsArg = process.argv.find((a) => a.startsWith("--years="));
  const years = yearsArg
    ? yearsArg.split("=")[1].split(",").map(Number)
    : [new Date().getFullYear(), new Date().getFullYear() + 1];

  const apiKey = process.env.INDONESIAN_HOLIDAYS_API_KEY || process.env.API_CO_ID_KEY;
  if (!apiKey) {
    console.error("Missing INDONESIAN_HOLIDAYS_API_KEY or API_CO_ID_KEY");
    process.exit(1);
  }

  const sb = createClient(url, key, { auth: { persistSession: false } });

  for (const year of years) {
    console.log(`Syncing Indonesian holidays for ${year}...`);
    const holidays = await fetchIndonesianHolidays({ year, apiKey });
    const rows = holidays
      .filter((h) => h.is_holiday || h.is_joint_holiday)
      .map((h) => ({
        date: h.date,
        name: h.name,
        type: h.type,
        is_joint_holiday: h.is_joint_holiday,
        is_observance: h.is_observance,
        year,
        source: "api.co.id",
      }));

    if (!rows.length) {
      console.log(`  No holidays found for ${year}`);
      continue;
    }

    const { error } = await sb.from("indonesian_holidays").upsert(rows, { onConflict: "date" });
    if (error) {
      console.error(`  Failed to upsert ${year}:`, error.message);
      process.exit(1);
    }
    console.log(`  Upserted ${rows.length} holidays for ${year}`);
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
