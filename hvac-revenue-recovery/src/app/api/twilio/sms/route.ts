import { NextRequest } from "next/server";
import { parseTwilioWebhook, findCompanyByTwilioNumber, WebhookError } from "@/lib/twilio/webhook";
import { twimlResponse } from "@/lib/twilio/client";
import { processInboundSms } from "@/lib/leads";
import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Inbound SMS webhook (Twilio Messaging "A message comes in").
 * Routes the message through the conversation state machine. Replies are sent
 * via the REST API (not TwiML) so they're logged uniformly with all other
 * outbound messages; the TwiML response is intentionally empty.
 */
export async function POST(req: NextRequest) {
  try {
    const params = await parseTwilioWebhook(req, "/api/twilio/sms");
    const company = await findCompanyByTwilioNumber(params.To ?? "");
    if (!company) {
      console.error(`[sms] No company for number ${params.To}`);
      return twimlResponse("");
    }

    const db = getAdminClient();
    const result = await processInboundSms(
      db,
      company,
      params.From,
      params.To,
      params.Body ?? "",
      params.MessageSid
    );

    if (result.outcome === "no_lead") {
      // Someone texted the tracking number without a missed call on file.
      // Stay quiet — unsolicited replies to unknown numbers create compliance risk.
      console.warn(`[sms] Inbound from ${params.From} with no lead on file (company ${company.id})`);
    }

    return twimlResponse("");
  } catch (e) {
    if (e instanceof WebhookError) return new Response(e.message, { status: e.status });
    console.error("[sms] webhook error", e);
    return twimlResponse("");
  }
}
