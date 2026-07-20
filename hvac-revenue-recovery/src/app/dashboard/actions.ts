"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionContext } from "@/lib/supabase/server";

/**
 * Server actions for dashboard mutations. All writes use the user's session
 * client so RLS enforces company isolation; audit entries record who changed what.
 */

const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "appointment_booked",
  "job_won",
  "closed_lost",
  "spam",
  "opted_out",
] as const;

const updateLeadSchema = z.object({
  leadId: z.string().uuid(),
  status: z.enum(LEAD_STATUSES).optional(),
  internal_notes: z.string().max(10000).optional(),
  appointment_at: z.string().optional(), // datetime-local value or ""
  job_value_dollars: z.string().optional(), // "" or number-like
  job_value_is_estimate: z.enum(["true", "false"]).optional(),
});

export async function updateLead(formData: FormData): Promise<{ error?: string }> {
  const session = await getSessionContext();
  if (!session) return { error: "Not signed in" };

  const parsed = updateLeadSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid input" };
  const input = parsed.data;

  const update: Record<string, unknown> = {};
  if (input.status) update.status = input.status;
  if (input.internal_notes !== undefined) update.internal_notes = input.internal_notes;
  if (input.appointment_at !== undefined) {
    update.appointment_at = input.appointment_at ? new Date(input.appointment_at).toISOString() : null;
  }
  if (input.job_value_dollars !== undefined) {
    if (input.job_value_dollars === "") {
      update.job_value_cents = null;
    } else {
      const v = Number(input.job_value_dollars);
      if (!Number.isFinite(v) || v < 0 || v > 10_000_000) return { error: "Invalid job value" };
      update.job_value_cents = Math.round(v * 100);
    }
  }
  if (input.job_value_is_estimate !== undefined) {
    update.job_value_is_estimate = input.job_value_is_estimate === "true";
  }

  // If a human marks the lead contacted/etc. while automation is mid-flow,
  // stop the bot from continuing to text the caller.
  if (input.status && ["contacted", "spam", "closed_lost"].includes(input.status)) {
    const { data: lead } = await session.supabase
      .from("leads")
      .select("conversation_stage")
      .eq("id", input.leadId)
      .single();
    const activeStages = [
      "initial_outreach", "awaiting_consent", "awaiting_name", "awaiting_issue",
      "awaiting_system_down", "awaiting_urgency", "awaiting_zip", "awaiting_callback_time",
    ];
    if (lead && activeStages.includes(lead.conversation_stage)) {
      update.conversation_stage = "human_takeover";
    }
  }

  const { error } = await session.supabase
    .from("leads")
    .update(update)
    .eq("id", input.leadId)
    .eq("company_id", session.companyId);
  if (error) return { error: error.message };

  await session.supabase.from("audit_log").insert({
    company_id: session.companyId,
    actor: session.user.id,
    action: "lead.updated",
    target_id: input.leadId,
    detail: update,
  });

  revalidatePath(`/dashboard/leads/${input.leadId}`);
  revalidatePath("/dashboard/leads");
  revalidatePath("/dashboard");
  return {};
}

const settingsSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  timezone: z.string().max(64).optional(),
  forward_to_number: z.string().max(20).optional(),
  dial_timeout_seconds: z.coerce.number().int().min(5).max(55).optional(),
  after_hours_forwarding: z.enum(["true", "false"]).optional(),
  quiet_hours_start: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  quiet_hours_end: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  quiet_hours_mode: z.enum(["immediate", "schedule", "notify_only"]).optional(),
  notify_sms_numbers: z.string().max(500).optional(), // comma-separated
  notify_emails: z.string().max(500).optional(),
  initial_outreach: z.string().max(1600).optional(),
  emergency_response: z.string().max(1600).optional(),
  completed_response: z.string().max(1600).optional(),
  help_response: z.string().max(1600).optional(),
  human_takeover_note: z.string().max(1600).optional(),
  consent_wording: z.string().max(2000).optional(),
  data_retention_days: z.coerce.number().int().min(30).max(3650).optional(),
  avg_job_value_dollars: z.coerce.number().min(0).max(100000).optional(),
  business_hours_json: z.string().max(5000).optional(),
  notify_on_responded: z.enum(["on"]).optional(),
  notify_on_qualified: z.enum(["on"]).optional(),
  notify_on_needs_human: z.enum(["on"]).optional(),
  a2p_json: z.string().max(5000).optional(),
});

const phoneRe = /^\+\d{10,15}$/;

export async function updateSettings(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const session = await getSessionContext();
  if (!session) return { error: "Not signed in" };

  const raw: Record<string, unknown> = {};
  formData.forEach((v, k) => {
    if (typeof v === "string") raw[k] = v;
  });
  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  }
  const input = parsed.data;

  const { data: company } = await session.supabase
    .from("companies")
    .select("templates, notify_on")
    .eq("id", session.companyId)
    .single();
  if (!company) return { error: "Company not found" };

  const update: Record<string, unknown> = {};
  if (input.name) update.name = input.name;
  if (input.timezone) update.timezone = input.timezone;
  if (input.forward_to_number !== undefined) {
    if (input.forward_to_number && !phoneRe.test(input.forward_to_number)) {
      return { error: "Forwarding number must be E.164, e.g. +12145551234" };
    }
    update.forward_to_number = input.forward_to_number || null;
  }
  if (input.dial_timeout_seconds) update.dial_timeout_seconds = input.dial_timeout_seconds;
  if (input.after_hours_forwarding) {
    update.after_hours_forwarding = input.after_hours_forwarding === "true";
  }
  if (input.quiet_hours_start) update.quiet_hours_start = input.quiet_hours_start;
  if (input.quiet_hours_end) update.quiet_hours_end = input.quiet_hours_end;
  if (input.quiet_hours_mode) update.quiet_hours_mode = input.quiet_hours_mode;

  if (input.notify_sms_numbers !== undefined) {
    const nums = input.notify_sms_numbers.split(",").map((s) => s.trim()).filter(Boolean);
    for (const n of nums) if (!phoneRe.test(n)) return { error: `Invalid SMS number: ${n}` };
    update.notify_sms_numbers = nums;
  }
  if (input.notify_emails !== undefined) {
    const emails = input.notify_emails.split(",").map((s) => s.trim()).filter(Boolean);
    for (const e of emails) {
      if (!z.string().email().safeParse(e).success) return { error: `Invalid email: ${e}` };
    }
    update.notify_emails = emails;
  }

  const templates = { ...(company.templates ?? {}) };
  for (const key of [
    "initial_outreach",
    "emergency_response",
    "completed_response",
    "help_response",
    "human_takeover_note",
  ] as const) {
    if (input[key] !== undefined) templates[key] = input[key];
  }
  update.templates = templates;
  // Changing emergency wording requires re-review by the company.
  if (input.emergency_response !== undefined) update.emergency_response_reviewed = false;

  if (input.consent_wording !== undefined) update.consent_wording = input.consent_wording;
  if (input.data_retention_days) update.data_retention_days = input.data_retention_days;
  if (input.avg_job_value_dollars !== undefined) {
    update.avg_job_value_cents = Math.round(input.avg_job_value_dollars * 100);
  }

  if (input.business_hours_json !== undefined && input.business_hours_json !== "") {
    try {
      const parsedHours = JSON.parse(input.business_hours_json);
      if (typeof parsedHours !== "object" || parsedHours === null) throw new Error("not an object");
      update.business_hours = parsedHours;
    } catch {
      return { error: "Business hours must be valid JSON" };
    }
  }
  if (input.a2p_json !== undefined && input.a2p_json !== "") {
    try {
      update.a2p_registration = JSON.parse(input.a2p_json);
    } catch {
      return { error: "A2P registration info must be valid JSON" };
    }
  }

  // Checkboxes: present = on, absent = off. Only apply when the submitting form
  // actually contained the notification section (marked by a hidden field),
  // so the templates/profile forms don't wipe these settings.
  if (raw.notify_section !== undefined) {
    update.notify_on = {
      ...(company.notify_on ?? {}),
      responded: input.notify_on_responded === "on",
      qualified: input.notify_on_qualified === "on",
      needs_human: input.notify_on_needs_human === "on",
      emergency: true, // emergencies always notify
    };
  }

  const { error } = await session.supabase
    .from("companies")
    .update(update)
    .eq("id", session.companyId);
  if (error) return { error: error.message };

  await session.supabase.from("audit_log").insert({
    company_id: session.companyId,
    actor: session.user.id,
    action: "settings.updated",
    detail: { fields: Object.keys(update) },
  });

  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export async function markEmergencyReviewed(): Promise<{ error?: string }> {
  const session = await getSessionContext();
  if (!session) return { error: "Not signed in" };
  const { error } = await session.supabase
    .from("companies")
    .update({ emergency_response_reviewed: true })
    .eq("id", session.companyId);
  if (error) return { error: error.message };
  await session.supabase.from("audit_log").insert({
    company_id: session.companyId,
    actor: session.user.id,
    action: "settings.emergency_wording_reviewed",
    detail: {},
  });
  revalidatePath("/dashboard/settings");
  return {};
}
