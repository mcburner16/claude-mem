#!/usr/bin/env node
/**
 * Provision a new HVAC company + owner login.
 *
 * Usage:
 *   node scripts/provision-company.mjs \
 *     --name "Smith Air & Heat" \
 *     --slug smith-air \
 *     --email owner@smithair.com \
 *     --password 'a-strong-password' \
 *     [--twilio-number +12145550100] \
 *     [--forward-to +12145551234] \
 *     [--timezone America/Chicago] \
 *     [--demo]
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the
 * environment (or a .env.local file in the project root).
 */
import { createClient } from "@supabase/supabase-js";
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

const args = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith("--")) {
    const key = argv[i].slice(2);
    if (argv[i + 1] && !argv[i + 1].startsWith("--")) {
      args[key] = argv[++i];
    } else {
      args[key] = true;
    }
  }
}

const required = ["name", "slug", "email", "password"];
for (const r of required) {
  if (!args[r]) {
    console.error(`Missing --${r}. Run with: --name --slug --email --password`);
    process.exit(1);
  }
}
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  // 1. Company (idempotent on slug)
  let { data: company } = await db.from("companies").select("id").eq("slug", args.slug).maybeSingle();
  if (!company) {
    const { data, error } = await db
      .from("companies")
      .insert({
        name: args.name,
        slug: args.slug,
        is_demo: Boolean(args.demo),
        timezone: args.timezone ?? "America/Chicago",
        twilio_number: args["twilio-number"] ?? null,
        forward_to_number: args["forward-to"] ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(`Company insert failed: ${error.message}`);
    company = data;
    console.log(`✓ Created company ${args.name} (${company.id})`);
  } else {
    console.log(`• Company ${args.slug} already exists (${company.id})`);
  }

  // 2. Auth user (idempotent on email)
  let userId;
  const { data: created, error: userErr } = await db.auth.admin.createUser({
    email: args.email,
    password: args.password,
    email_confirm: true,
  });
  if (userErr) {
    if (/already/i.test(userErr.message)) {
      const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
      const existing = list?.users.find((u) => u.email === args.email);
      if (!existing) throw new Error(`User exists but not found: ${userErr.message}`);
      userId = existing.id;
      console.log(`• User ${args.email} already exists (${userId})`);
    } else {
      throw new Error(`User creation failed: ${userErr.message}`);
    }
  } else {
    userId = created.user.id;
    console.log(`✓ Created user ${args.email} (${userId})`);
  }

  // 3. Membership
  const { error: memberErr } = await db
    .from("company_users")
    .upsert({ company_id: company.id, user_id: userId, role: "owner" });
  if (memberErr) throw new Error(`Membership failed: ${memberErr.message}`);
  console.log(`✓ Linked ${args.email} to ${args.name} as owner`);
  console.log(`\nDone. They can sign in at ${process.env.NEXT_PUBLIC_APP_URL ?? "the app"}/login`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
