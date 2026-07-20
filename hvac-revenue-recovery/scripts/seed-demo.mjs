#!/usr/bin/env node
/**
 * Seed (or reset) the demo company's data by calling the running app's demo
 * endpoint. Requires the app to be running and DEMO_SECRET set.
 *
 * Usage: node scripts/seed-demo.mjs [http://localhost:3000]
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envFile = resolve(root, ".env.local");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}

const base = process.argv[2] ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
if (!process.env.DEMO_SECRET) {
  console.error("DEMO_SECRET is required (env or .env.local).");
  process.exit(1);
}

const res = await fetch(new URL("/api/demo/reset", base), {
  method: "POST",
  headers: { "x-demo-secret": process.env.DEMO_SECRET },
});
const json = await res.json();
if (!res.ok) {
  console.error("Reset failed:", json);
  process.exit(1);
}
console.log(`✓ Demo data reset — ${json.seeded_leads} sample leads seeded.`);
