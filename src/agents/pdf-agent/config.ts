export interface PdfAgentConfig {
  anthropicApiKey: string;
  etsyApiKey: string;
  etsyApiSecret: string;
  etsyAccessToken: string;
  etsyShopId: string;
  pdfsPerDay: number;
  outputDir: string;
  niche?: string;
  priceUsd: number;
}

export function loadConfig(dryRun = false): PdfAgentConfig {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Missing required env var: ANTHROPIC_API_KEY");
  }

  if (!dryRun) {
    const etsyRequired = ["ETSY_API_KEY", "ETSY_API_SECRET", "ETSY_ACCESS_TOKEN", "ETSY_SHOP_ID"];
    for (const key of etsyRequired) {
      if (!process.env[key]) {
        throw new Error(
          `Missing required env var: ${key}\n` +
            "Etsy credentials are required unless running with --dry-run"
        );
      }
    }
  }

  return {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
    etsyApiKey: process.env.ETSY_API_KEY!,
    etsyApiSecret: process.env.ETSY_API_SECRET!,
    etsyAccessToken: process.env.ETSY_ACCESS_TOKEN!,
    etsyShopId: process.env.ETSY_SHOP_ID!,
    pdfsPerDay: parseInt(process.env.PDFS_PER_DAY ?? "100"),
    outputDir: process.env.PDF_OUTPUT_DIR ?? "./generated-pdfs",
    niche: process.env.PDF_NICHE,
    priceUsd: parseFloat(process.env.PDF_PRICE_USD ?? "4.99"),
  };
}
