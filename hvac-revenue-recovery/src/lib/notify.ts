import { SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "./env";
import { sendSms } from "./twilio/client";

export interface CompanyRow {
  id: string;
  name: string;
  slug: string;
  is_demo: boolean;
  timezone: string;
  twilio_number: string | null;
  forward_to_number: string | null;
  dial_timeout_seconds: number;
  after_hours_forwarding: boolean;
  business_hours: Record<string, { open: string; close: string; closed?: boolean }>;
  quiet_hours_start: string;
  quiet_hours_end: string;
  quiet_hours_mode: "immediate" | "schedule" | "notify_only";
  templates: Record<string, string>;
  notify_sms_numbers: string[];
  notify_emails: string[];
  notify_on: Record<string, boolean>;
  avg_job_value_cents: number;
}

export interface LeadSummary {
  id: string;
  caller_phone: string;
  status: string;
  answers: {
    name?: string;
    issue?: string;
    system_down?: boolean;
    urgency?: string;
    zip?: string;
    callback_time?: string;
  };
  is_emergency: boolean;
}

const REASON_LABELS: Record<string, string> = {
  new_lead: "NEW MISSED-CALL LEAD",
  responded: "CALLER RESPONDED",
  qualified: "QUALIFIED LEAD",
  emergency: "⚠️ EMERGENCY LANGUAGE DETECTED",
  needs_human: "CONVERSATION NEEDS A HUMAN",
};

export function formatLeadNotification(lead: LeadSummary, reason: string, appUrl: string): string {
  const a = lead.answers ?? {};
  const lines = [
    REASON_LABELS[reason] ?? reason.toUpperCase(),
    "",
    `Name: ${a.name ?? "Unknown"}`,
    `Phone: ${lead.caller_phone}`,
    `Issue: ${a.issue ?? "Not provided yet"}`,
  ];
  if (a.system_down !== undefined) lines.push(`System down: ${a.system_down ? "YES" : "No"}`);
  if (a.urgency) lines.push(`Urgency: ${a.urgency}`);
  if (a.zip) lines.push(`ZIP: ${a.zip}`);
  if (a.callback_time) lines.push(`Callback preference: ${a.callback_time}`);
  lines.push(`Status: ${lead.status.replace(/_/g, " ")}`);
  lines.push("", `View: ${appUrl}/dashboard/leads/${lead.id}`);
  return lines.join("\n");
}

/**
 * Notify the company's configured recipients about a lead event.
 * Failures are logged to the notifications table, never thrown — a broken
 * notification must not break webhook processing.
 */
export async function notifyOwner(
  db: SupabaseClient,
  company: CompanyRow,
  lead: LeadSummary,
  reason: "new_lead" | "responded" | "qualified" | "emergency" | "needs_human"
): Promise<void> {
  const env = getEnv();
  // Emergency notifications always fire; others honor the company's notify_on config.
  if (reason !== "emergency" && reason !== "new_lead" && company.notify_on?.[reason] === false) return;

  const body = formatLeadNotification(lead, reason, env.NEXT_PUBLIC_APP_URL);

  // SMS to owner/dispatcher numbers
  for (const to of company.notify_sms_numbers ?? []) {
    let success = true;
    let error: string | undefined;
    if (company.is_demo || env.DRY_RUN) {
      // demo: log only
    } else if (company.twilio_number) {
      const res = await sendSms({ from: company.twilio_number, to, body });
      if ("error" in res) {
        success = false;
        error = res.error;
      }
    } else {
      success = false;
      error = "No Twilio number configured";
    }
    await db.from("notifications").insert({
      company_id: company.id,
      lead_id: lead.id,
      reason,
      channel: "sms",
      recipient: to,
      success,
      error,
    });
  }

  // Email to configured addresses
  for (const to of company.notify_emails ?? []) {
    let success = true;
    let error: string | undefined;
    if (company.is_demo || env.DRY_RUN || !env.RESEND_API_KEY) {
      // demo / dry-run / unconfigured: log only
      if (!env.RESEND_API_KEY && !company.is_demo && !env.DRY_RUN) {
        success = false;
        error = "RESEND_API_KEY not configured";
      }
    } else {
      const r = await sendEmail({
        to,
        subject: `${REASON_LABELS[reason] ?? reason} — ${company.name}`,
        text: body,
      });
      if (r.error) {
        success = false;
        error = r.error;
      }
    }
    await db.from("notifications").insert({
      company_id: company.id,
      lead_id: lead.id,
      reason,
      channel: "email",
      recipient: to,
      success,
      error,
    });
  }
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}): Promise<{ error?: string }> {
  const env = getEnv();
  if (env.DRY_RUN) return {};
  if (!env.RESEND_API_KEY) return { error: "RESEND_API_KEY not configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [opts.to],
        subject: opts.subject,
        text: opts.text,
        html: opts.html,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      return { error: `Resend ${res.status}: ${t.slice(0, 300)}` };
    }
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Resend request failed" };
  }
}
