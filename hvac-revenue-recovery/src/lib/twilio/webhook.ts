import { NextRequest } from "next/server";
import { getEnv } from "../env";
import { validateTwilioSignature } from "./signature";
import { getAdminClient } from "../supabase/admin";
import { CompanyRow } from "../notify";

export class WebhookError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

/**
 * Parse + authenticate a Twilio webhook request.
 * The signature is computed over the public URL Twilio called (we rebuild it
 * from NEXT_PUBLIC_APP_URL so proxies/rewrites don't break validation).
 */
export async function parseTwilioWebhook(
  req: NextRequest,
  path: string
): Promise<Record<string, string>> {
  const env = getEnv();
  const form = await req.formData();
  const params: Record<string, string> = {};
  form.forEach((value, key) => {
    if (typeof value === "string") params[key] = value;
  });

  if (!env.SKIP_TWILIO_SIGNATURE_VALIDATION) {
    const url = new URL(path, env.NEXT_PUBLIC_APP_URL);
    // Twilio includes the query string in the signed URL
    req.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v));
    const ok = validateTwilioSignature(
      env.TWILIO_AUTH_TOKEN,
      req.headers.get("x-twilio-signature"),
      url.toString(),
      params
    );
    if (!ok) throw new WebhookError("Invalid Twilio signature", 403);
  }
  return params;
}

/** Look up the company that owns the Twilio number that was called/texted. */
export async function findCompanyByTwilioNumber(toNumber: string): Promise<CompanyRow | null> {
  const db = getAdminClient();
  const { data } = await db
    .from("companies")
    .select("*")
    .eq("twilio_number", toNumber)
    .maybeSingle();
  return (data as CompanyRow | null) ?? null;
}
