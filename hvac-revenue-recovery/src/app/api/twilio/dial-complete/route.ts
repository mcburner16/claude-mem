import { NextRequest } from "next/server";
import { parseTwilioWebhook, findCompanyByTwilioNumber, WebhookError } from "@/lib/twilio/webhook";
import { twimlResponse, escapeXml } from "@/lib/twilio/client";
import { processCallOutcome } from "@/lib/leads";
import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * <Dial action> callback — fires when the forwarded dial attempt finishes.
 * DialCallStatus tells us whether the company's line answered:
 *   completed          → answered, no recovery text
 *   no-answer/busy/failed/canceled → missed, trigger recovery
 * Idempotent on CallSid via a unique constraint in the calls table.
 */
export async function POST(req: NextRequest) {
  try {
    const params = await parseTwilioWebhook(req, "/api/twilio/dial-complete");
    const company = await findCompanyByTwilioNumber(params.To ?? "");
    if (!company) {
      console.error(`[dial-complete] No company for number ${params.To}`);
      return twimlResponse("<Hangup/>");
    }

    const db = getAdminClient();
    const afterHours = req.nextUrl.searchParams.get("afterHours") === "1";
    const result = await processCallOutcome(db, company, {
      callSid: params.CallSid,
      from: params.From,
      to: params.To,
      dialStatus: params.DialCallStatus ?? "failed",
      afterHours,
      durationSeconds: params.DialCallDuration ? Number(params.DialCallDuration) : undefined,
      raw: { source: "dial_complete", ...params },
    });

    if (result.outcome === "answered" || result.outcome === "duplicate") {
      return twimlResponse("<Hangup/>");
    }

    // Missed call: tell the caller a text is on the way, then hang up.
    return twimlResponse(
      `<Say voice="alice">Sorry we missed your call to ${escapeXml(company.name)}. We are sending you a text message right now so we can help.</Say><Hangup/>`
    );
  } catch (e) {
    if (e instanceof WebhookError) return new Response(e.message, { status: e.status });
    console.error("[dial-complete] webhook error", e);
    return twimlResponse("<Hangup/>");
  }
}
