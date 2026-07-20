import { getEnv } from "../env";

/**
 * Thin Twilio REST wrapper (SMS send only) — a fetch call instead of the full
 * SDK keeps the dependency surface small. Returns the Message SID on success.
 */
export async function sendSms(opts: {
  from: string;
  to: string;
  body: string;
}): Promise<{ sid: string } | { error: string }> {
  const env = getEnv();
  if (env.DRY_RUN) {
    return { sid: `DRYRUN_${Date.now()}_${Math.random().toString(36).slice(2, 10)}` };
  }
  const url = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`;
  const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString("base64");
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ From: opts.from, To: opts.to, Body: opts.body }).toString(),
    });
    const json = (await res.json()) as { sid?: string; message?: string };
    if (!res.ok || !json.sid) {
      return { error: json.message ?? `Twilio API error ${res.status}` };
    }
    return { sid: json.sid };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Twilio request failed" };
  }
}

/** Build TwiML response strings without a templating dependency. */
export function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function twimlResponse(inner: string): Response {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${inner}</Response>`, {
    headers: { "Content-Type": "text/xml" },
  });
}
