#!/usr/bin/env node
/**
 * Run staff agents Supabase migration.
 * Requires SUPABASE_DB_PASSWORD in .env.local (Project Settings → Database).
 *
 * Usage: npm run setup:staff-supabase
 */
import fs from "fs";
import path from "path";
import pg from "pg";

const { Client } = pg;

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim();
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ref = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
const password = process.env.SUPABASE_DB_PASSWORD;

if (!ref || !password) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_DB_PASSWORD.\n" +
      "Add SUPABASE_DB_PASSWORD to .env.local (Supabase → Project Settings → Database),\n" +
      "or paste supabase/migrations/005_staff_agents_complete.sql into SQL Editor."
  );
  process.exit(1);
}

const connectionString =
  process.env.SUPABASE_DB_URL ??
  `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`;

const sqlPath = path.join(process.cwd(), "supabase/migrations/005_staff_agents_complete.sql");
const sql = fs.readFileSync(sqlPath, "utf8");

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  await client.query(sql);
  console.log("✓ Staff agents tables created/updated in Supabase.");
} catch (err) {
  console.error("Migration failed:", err instanceof Error ? err.message : err);
  process.exit(1);
} finally {
  await client.end();
}
