#!/usr/bin/env node
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
  console.error("Paste supabase/migrations/011_content_plan.sql ke Supabase SQL Editor.");
  process.exit(1);
}

const connectionString =
  process.env.SUPABASE_DB_URL ??
  `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`;

const sql = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/011_content_plan.sql"), "utf8");
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query(sql);
  console.log("OK: migration 011_content_plan applied");
} finally {
  await client.end();
}
