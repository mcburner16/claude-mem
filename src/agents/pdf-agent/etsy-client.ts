import fs from "fs";
import type { GuideContent } from "./content-generator.js";

const ETSY_API_BASE = "https://openapi.etsy.com/v3/application";

export interface EtsyListing {
  listing_id: number;
  title: string;
  url: string;
}

interface EtsyListingResponse {
  listing_id: number;
  title: string;
  url?: string;
}

async function etsyFetch(
  path: string,
  options: RequestInit,
  apiKey: string,
  accessToken: string
): Promise<Response> {
  const response = await fetch(`${ETSY_API_BASE}${path}`, {
    ...options,
    headers: {
      "x-api-key": apiKey,
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Etsy API ${response.status} on ${path}: ${body.slice(0, 300)}`
    );
  }

  return response;
}

export async function createDigitalListing(
  content: GuideContent,
  pdfPath: string,
  shopId: string,
  priceUsd: number,
  apiKey: string,
  accessToken: string
): Promise<EtsyListing> {
  // Etsy requires price in cents (USD * 100)
  const priceAmount = Math.round(priceUsd * 100);

  const listingBody = {
    quantity: 999,
    title: content.title.slice(0, 140),
    description: content.etsyDescription,
    price: priceAmount,
    who_made: "i_did",
    when_made: "made_to_order",
    taxonomy_id: 2078, // Digital Downloads > Documents
    type: "download",
    is_digital: true,
    tags: content.etsyTags.slice(0, 13),
    materials: [],
    shipping_profile_id: null,
    state: "draft", // start as draft so you can review before activating
  };

  const createResp = await etsyFetch(
    `/shops/${shopId}/listings`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(listingBody),
    },
    apiKey,
    accessToken
  );

  const listing = (await createResp.json()) as EtsyListingResponse;

  // Upload the PDF file to the listing
  const fileBuffer = await fs.promises.readFile(pdfPath);
  const formData = new FormData();
  const blob = new Blob([fileBuffer], { type: "application/pdf" });
  formData.append("file", blob, `${listing.listing_id}-guide.pdf`);
  formData.append("name", content.title.slice(0, 70));
  formData.append("rank", "1");

  await etsyFetch(
    `/shops/${shopId}/listings/${listing.listing_id}/files`,
    { method: "POST", body: formData },
    apiKey,
    accessToken
  );

  return {
    listing_id: listing.listing_id,
    title: listing.title,
    url: `https://www.etsy.com/listing/${listing.listing_id}`,
  };
}

// OAuth helpers for first-time setup
export function buildOAuthUrl(apiKey: string, redirectUri: string): string {
  const scopes = "listings_w listings_r transactions_r";
  const state = Math.random().toString(36).slice(2);
  const params = new URLSearchParams({
    response_type: "code",
    redirect_uri: redirectUri,
    client_id: apiKey,
    scope: scopes,
    state,
  });
  return `https://www.etsy.com/oauth/connect?${params}`;
}

export async function exchangeOAuthCode(
  code: string,
  apiKey: string,
  apiSecret: string,
  redirectUri: string
): Promise<{ access_token: string; refresh_token: string }> {
  const resp = await fetch("https://api.etsy.com/v3/public/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: apiKey,
      client_secret: apiSecret,
      redirect_uri: redirectUri,
      code,
    }),
  });

  if (!resp.ok) throw new Error(`OAuth exchange failed: ${await resp.text()}`);
  return resp.json() as Promise<{ access_token: string; refresh_token: string }>;
}
