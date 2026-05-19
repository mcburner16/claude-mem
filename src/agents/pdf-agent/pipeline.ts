import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { generateTopics, selectNiche } from "./topic-generator.js";
import { generateGuideContent } from "./content-generator.js";
import { generatePdf } from "./pdf-generator.js";
import { createDigitalListing } from "./etsy-client.js";
import type { PdfAgentConfig } from "./config.js";

export interface PipelineResult {
  topicTitle: string;
  pdfPath: string;
  etsyListingId?: number;
  etsyUrl?: string;
  error?: string;
  durationMs: number;
}

export interface BatchReport {
  date: string;
  niche: string;
  total: number;
  succeeded: number;
  failed: number;
  results: PipelineResult[];
}

// Process a single guide from topic → PDF → Etsy listing
export async function processSingleGuide(
  client: Anthropic,
  topic: { title: string; subtitle: string; targetAudience: string; keyPoints: string[]; etsyTags: string[] },
  config: PdfAgentConfig,
  uploadToEtsy: boolean
): Promise<PipelineResult> {
  const start = Date.now();

  try {
    console.log(`  📝 Generating content: "${topic.title}"`);
    const content = await generateGuideContent(client, topic);

    console.log(`  📄 Building PDF...`);
    const pdfPath = await generatePdf(content, config.outputDir);

    let etsyListingId: number | undefined;
    let etsyUrl: string | undefined;

    if (uploadToEtsy) {
      console.log(`  🛒 Creating Etsy listing...`);
      const listing = await createDigitalListing(
        content,
        pdfPath,
        config.etsyShopId,
        config.priceUsd,
        config.etsyApiKey,
        config.etsyAccessToken
      );
      etsyListingId = listing.listing_id;
      etsyUrl = listing.url;
      console.log(`  ✅ Listed: ${listing.url}`);
    } else {
      console.log(`  ✅ PDF saved: ${path.basename(pdfPath)}`);
    }

    return {
      topicTitle: topic.title,
      pdfPath,
      etsyListingId,
      etsyUrl,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  ❌ Failed: ${message}`);
    return {
      topicTitle: topic.title,
      pdfPath: "",
      error: message,
      durationMs: Date.now() - start,
    };
  }
}

// Run the full daily batch
export async function runDailyBatch(
  config: PdfAgentConfig,
  uploadToEtsy = true
): Promise<BatchReport> {
  const client = new Anthropic({ apiKey: config.anthropicApiKey });
  const niche = selectNiche(config.niche);
  const total = config.pdfsPerDay;

  console.log(`\n🚀 Daily PDF batch — ${new Date().toLocaleDateString()}`);
  console.log(`   Niche: ${niche}`);
  console.log(`   Target: ${total} guides\n`);

  // Generate topics in batches of 10 to stay within token limits
  const BATCH_SIZE = 10;
  const topicBatches = Math.ceil(total / BATCH_SIZE);
  const allTopics: Awaited<ReturnType<typeof generateTopics>> = [];

  for (let b = 0; b < topicBatches; b++) {
    const batchCount = Math.min(BATCH_SIZE, total - allTopics.length);
    console.log(`📋 Generating ${batchCount} topics (batch ${b + 1}/${topicBatches})...`);
    const batch = await generateTopics(client, niche, batchCount);
    allTopics.push(...batch);
  }

  console.log(`\n✅ Got ${allTopics.length} topics. Starting PDF pipeline...\n`);

  const results: PipelineResult[] = [];

  // Spread 100 PDFs across the day: process with small delays to avoid rate limits
  // At 100/day: one every ~14 min. We process as fast as possible, delay only if needed.
  for (let i = 0; i < allTopics.length; i++) {
    const topic = allTopics[i];
    console.log(`[${i + 1}/${allTopics.length}] ${topic.title}`);
    const result = await processSingleGuide(client, topic, config, uploadToEtsy);
    results.push(result);

    // Small pause between guides to avoid Anthropic rate limits
    if (i < allTopics.length - 1) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  const report: BatchReport = {
    date: new Date().toISOString(),
    niche,
    total,
    succeeded: results.filter((r) => !r.error).length,
    failed: results.filter((r) => !!r.error).length,
    results,
  };

  // Save report
  const reportPath = path.join(
    config.outputDir,
    `report-${new Date().toISOString().split("T")[0]}.json`
  );
  await fs.promises.writeFile(reportPath, JSON.stringify(report, null, 2));

  console.log(`\n📊 Batch complete:`);
  console.log(`   ✅ Succeeded: ${report.succeeded}`);
  console.log(`   ❌ Failed:    ${report.failed}`);
  console.log(`   📁 Report:    ${reportPath}\n`);

  return report;
}
