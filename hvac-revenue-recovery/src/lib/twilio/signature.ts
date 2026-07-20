import crypto from "crypto";

/**
 * Validate Twilio's X-Twilio-Signature header.
 * Algorithm (per Twilio docs): HMAC-SHA1 over (full URL + form params sorted by
 * key, values concatenated), base64-encoded, compared to the header.
 * Implemented directly to avoid pulling in the full twilio SDK.
 */
export function computeTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>
): string {
  const data =
    url +
    Object.keys(params)
      .sort()
      .map((k) => k + params[k])
      .join("");
  return crypto.createHmac("sha1", authToken).update(Buffer.from(data, "utf-8")).digest("base64");
}

export function validateTwilioSignature(
  authToken: string,
  signatureHeader: string | null,
  url: string,
  params: Record<string, string>
): boolean {
  if (!signatureHeader) return false;
  const expected = computeTwilioSignature(authToken, url, params);
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
