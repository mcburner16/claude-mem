import { NextRequest } from "next/server";
import { parseTwilioWebhook, findCompanyByTwilioNumber, WebhookError } from "@/lib/twilio/webhook";
import { twimlResponse, escapeXml } from "@/lib/twilio/client";
import { isWithinBusinessHours, DEFAULT_BUSINESS_HOURS } from "@/lib/business-hours";
import { processCallOutcome } from "@/lib/leads";
import { getAdminClient } from "@/lib/supabase/admin";
import { getEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Inbound call webhook (Twilio Voice "A call comes in").
 * Forwards the call to the company's real line via <Dial>. The dial timeout is
 * configured shorter than the company's voicemail pickup so voicemail doesn't
 * swallow missed calls. The <Dial action> callback decides whether the call
 * was answered.
 */
export async function POST(req: NextRequest) {
  try {
    const params = await parseTwilioWebhook(req, "/api/twilio/voice");
    const company = await findCompanyByTwilioNumber(params.To ?? "");
    if (!company) {
      console.error(`[voice] No company configured for number ${params.To}`);
      return twimlResponse("<Reject/>");
    }

    const hours = Object.keys(company.business_hours ?? {}).length
      ? company.business_hours
      : DEFAULT_BUSINESS_HOURS;
    const withinHours = isWithinBusinessHours(new Date(), hours, company.timezone);
    const afterHours = !withinHours;

    // After hours with forwarding disabled: no dial — treat the call as missed
    // immediately and let the caller know a text is coming.
    if (afterHours && !company.after_hours_forwarding) {
      const db = getAdminClient();
      await processCallOutcome(db, company, {
        callSid: params.CallSid,
        from: params.From,
        to: params.To,
        dialStatus: "no-answer",
        afterHours: true,
        raw: { source: "voice_webhook_after_hours", ...params },
      });
      return twimlResponse(
        `<Say voice="alice">Thank you for calling ${escapeXml(company.name)}. We are currently closed. We are sending you a text message so we can collect a few details and follow up.</Say><Hangup/>`
      );
    }

    if (!company.forward_to_number) {
      console.error(`[voice] Company ${company.id} has no forward_to_number`);
      return twimlResponse(
        `<Say voice="alice">Thank you for calling ${escapeXml(company.name)}. Please leave a message after the tone.</Say><Hangup/>`
      );
    }

    const env = getEnv();
    const action = new URL("/api/twilio/dial-complete", env.NEXT_PUBLIC_APP_URL);
    if (afterHours) action.searchParams.set("afterHours", "1");
    const timeout = Math.min(Math.max(company.dial_timeout_seconds || 20, 5), 55);

    return twimlResponse(
      `<Dial timeout="${timeout}" action="${escapeXml(action.toString())}" answerOnBridge="true">${escapeXml(company.forward_to_number)}</Dial>`
    );
  } catch (e) {
    if (e instanceof WebhookError) return new Response(e.message, { status: e.status });
    console.error("[voice] webhook error", e);
    // Fail safe for the caller: never dead-air a real customer call.
    return twimlResponse(`<Say voice="alice">We're sorry, we're unable to take your call right now. Please try again shortly.</Say><Hangup/>`);
  }
}
