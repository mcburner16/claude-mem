#!/usr/bin/env node
/**
 * PDF Guide Generator Agent
 *
 * Generates high-quality how-to guide PDFs and lists them on Etsy.
 *
 * Usage:
 *   bun src/agents/pdf-agent/index.ts              # run one batch now
 *   bun src/agents/pdf-agent/index.ts --schedule   # start daily scheduler
 *   bun src/agents/pdf-agent/index.ts --dry-run    # generate PDFs only (no Etsy upload)
 *   bun src/agents/pdf-agent/index.ts --count 5    # generate only 5 guides
 *
 * Required env vars: see README.md
 */

import { loadConfig } from "./config.js";
import { runDailyBatch } from "./pipeline.js";
import { startScheduler } from "./scheduler.js";

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const isSchedule = args.includes("--schedule");
const countArg = args.indexOf("--count");
const overrideCount = countArg !== -1 ? parseInt(args[countArg + 1]) : null;

async function main(): Promise<void> {
  try {
    const config = loadConfig();

    if (overrideCount !== null && !isNaN(overrideCount)) {
      config.pdfsPerDay = overrideCount;
    }

    if (isDryRun) {
      console.log("🔍 Dry run mode — PDFs will be generated but NOT uploaded to Etsy");
    }

    if (isSchedule) {
      startScheduler(!isDryRun);
    } else {
      await runDailyBatch(config, !isDryRun);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\n❌ ${message}\n`);
    process.exit(1);
  }
}

main();
