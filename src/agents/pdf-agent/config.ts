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

export function loadConfig(): PdfAgentConfig {
  const required = [
    "ANTHROPIC_API_KEY",
    "ETSY_API_KEY",
    "ETSY_API_SECRET",
    "ETSY_ACCESS_TOKEN",
    "ETSY_SHOP_ID",
  ];

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(
        `Missing required env var: ${key}\n` +
          "See src/agents/pdf-agent/README.md for setup instructions."
      );
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
