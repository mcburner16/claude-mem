import cron from "node-cron";
import { runDailyBatch } from "./pipeline.js";
import { loadConfig } from "./config.js";

export function startScheduler(uploadToEtsy = true): void {
  const config = loadConfig();

  console.log("⏰ PDF Agent scheduler started");
  console.log(`   Will run daily at 6:00 AM`);
  console.log(`   Target: ${config.pdfsPerDay} PDFs/day → Etsy\n`);

  // Run immediately on start (so you can verify it works)
  console.log("▶️  Running initial batch now...");
  runDailyBatch(config, uploadToEtsy).catch(console.error);

  // Then schedule daily at 6 AM
  cron.schedule("0 6 * * *", async () => {
    console.log(`\n⏰ Scheduled batch starting at ${new Date().toLocaleString()}`);
    try {
      await runDailyBatch(config, uploadToEtsy);
    } catch (err) {
      console.error("Batch failed:", err);
    }
  });
}
