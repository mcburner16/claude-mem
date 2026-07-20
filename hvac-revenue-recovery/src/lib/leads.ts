import { SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "./env";
import { sendSms } from "./twilio/client";
import { notifyOwner, CompanyRow, LeadSummary } from "./notify";
import { renderTemplate } from "./templates";
import { DEFAULT_TEMPLATES, CompanyTemplates, ConversationState } from "./conversation/types";
import { handleInboundMessage, initialConversationState } from "./conversation/state-machine";
import { isWithinQuietHours } from "./business-hours";

/**
 * Core lead lifecycle used by both real Twilio webhooks and demo simulation.
 * All functions take the service-role client and an explicit company row so
 * every query is company-scoped.
 */

export function companyTemplates(company: CompanyRow): CompanyTemplates {
  return {
    company_name: company.name,
    initial_outreach: company.templates?.initial_outreach ?? DEFAULT_TEMPLATES.initial_outreach,
    emergency_response: company.templates?.emergency_response ?? DEFAULT_TEMPLATES.emergency_response,
    completed_response: company.templates?.completed_response ?? DEFAULT_TEMPLATES.completed_response,
    opt_out_confirmation: company.templates?.opt_out_confirmation ?? DEFAULT_TEMPLATES.opt_out_confirmation,
    help_response: company.templates?.help_response ?? DEFAULT_TEMPLATES.help_response,
    human_takeover_note: company.templates?.human_takeover_note ?? DEFAULT_TEMPLATES.human_takeover_note,
  };
}

/** Max outbound texts to one caller per hour (belt-and-suspenders loop guard). */
export const OUTBOUND_RATE_LIMIT_PER_HOUR = 12;
/** Don't create a second lead / send a second outreach for the same caller within this window. */
export const LEAD_DEDUPE_HOURS = 24;

async function checkRateLimit(db: SupabaseClient, companyId: string, phone: string): Promise<boolean> {
  const { data, error } = await db.rpc("increment_rate_limit", {
    p_key: `sms:${companyId}:${phone}`,
    p_window_seconds: 3600,
  });
  if (error) return true; // fail open: a broken limiter must not block a real lead
  return (data as number) <= OUTBOUND_RATE_LIMIT_PER_HOUR;
}

/** Record + actually send an outbound SMS to a caller. Demo companies never hit Twilio. */
export async function sendToCaller(
  db: SupabaseClient,
  company: CompanyRow,
  leadId: string,
  to: string,
  body: string,
  kind: "conversation" | "initial_outreach" | "emergency" = "conversation"
): Promise<void> {
  const allowed = await checkRateLimit(db, company.id, to);
  if (!allowed) {
    await db.from("messages").insert({
      company_id: company.id,
      lead_id: leadId,
      direction: "outbound",
      from_number: company.twilio_number ?? "demo",
      to_number: to,
      body,
      kind,
      send_error: "rate_limited: outbound cap reached for this caller",
    });
    return;
  }

  let sid: string | null = null;
  let sendError: string | null = null;
  if (company.is_demo) {
    sid = `DEMO_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  } else if (!company.twilio_number) {
    sendError = "No Twilio number configured for company";
  } else {
    const res = await sendSms({ from: company.twilio_number, to, body });
    if ("error" in res) sendError = res.error;
    else sid = res.sid;
  }

  await db.from("messages").insert({
    company_id: company.id,
    lead_id: leadId,
    direction: "outbound",
    from_number: company.twilio_number ?? "demo",
    to_number: to,
    body,
    kind,
    twilio_sid: sid,
    send_error: sendError,
  });
}

export interface MissedCallEvent {
  callSid: string;
  from: string; // caller, E.164
  to: string; // the Twilio tracking number
  dialStatus: string; // no-answer | busy | failed | canceled | completed
  afterHours: boolean;
  durationSeconds?: number;
  raw?: Record<string, unknown>;
}

export type MissedCallResult =
  | { outcome: "answered" }
  | { outcome: "duplicate" }
  | { outcome: "opted_out" }
  | { outcome: "lead_exists"; leadId: string }
  | { outcome: "lead_created"; leadId: string; textSent: boolean; quietHours: boolean };

const MISSED_STATUSES = new Set(["no-answer", "busy", "failed", "canceled"]);

/**
 * Process a completed <Dial> attempt. Idempotent on (company_id, call_sid).
 * Creates a lead + sends the recovery text only for genuinely missed calls.
 */
export async function processCallOutcome(
  db: SupabaseClient,
  company: CompanyRow,
  event: MissedCallEvent
): Promise<MissedCallResult> {
  const missed = MISSED_STATUSES.has(event.dialStatus) || (event.afterHours && event.dialStatus !== "completed");
  const answered = event.dialStatus === "completed";

  // Idempotent call record — a repeated webhook for the same CallSid is a no-op.
  const { error: insertErr } = await db.from("calls").insert({
    company_id: company.id,
    call_sid: event.callSid,
    from_number: event.from,
    to_number: event.to,
    dial_status: event.dialStatus,
    answered,
    after_hours: event.afterHours,
    duration_seconds: event.durationSeconds ?? null,
    raw: event.raw ?? {},
  });
  if (insertErr) {
    if (insertErr.code === "23505") return { outcome: "duplicate" };
    throw new Error(`Failed to record call: ${insertErr.message}`);
  }

  if (answered || !missed) return { outcome: "answered" };

  // Respect opt-outs
  const { data: optedOut } = await db
    .from("opt_outs")
    .select("phone")
    .eq("company_id", company.id)
    .eq("phone", event.from)
    .maybeSingle();
  if (optedOut) return { outcome: "opted_out" };

  // Dedupe: if this caller already has an active lead in the window, attach the
  // call as a note instead of texting them again.
  const since = new Date(Date.now() - LEAD_DEDUPE_HOURS * 3600 * 1000).toISOString();
  const { data: existing } = await db
    .from("leads")
    .select("id, answers")
    .eq("company_id", company.id)
    .eq("caller_phone", event.from)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) {
    const notes = [...(existing.answers?.notes ?? []), `Caller called again (${event.dialStatus}) — no duplicate text sent.`];
    await db
      .from("leads")
      .update({ answers: { ...existing.answers, notes } })
      .eq("id", existing.id)
      .eq("company_id", company.id);
    return { outcome: "lead_exists", leadId: existing.id as string };
  }

  // Get call row id to link the lead to its source call
  const { data: callRow } = await db
    .from("calls")
    .select("id")
    .eq("company_id", company.id)
    .eq("call_sid", event.callSid)
    .single();

  const init = initialConversationState();
  const { data: lead, error: leadErr } = await db
    .from("leads")
    .insert({
      company_id: company.id,
      caller_phone: event.from,
      source_call_id: callRow?.id ?? null,
      status: "new",
      conversation_stage: init.stage,
      answers: init.answers,
    })
    .select("id")
    .single();
  if (leadErr || !lead) throw new Error(`Failed to create lead: ${leadErr?.message}`);

  // Quiet hours: create the lead but hold the outreach text. (MVP: the owner is
  // notified; a scheduled sender is a post-pilot improvement documented in the roadmap.)
  const quiet = isWithinQuietHours(
    new Date(),
    company.timezone,
    company.quiet_hours_start,
    company.quiet_hours_end
  );

  let textSent = false;
  if (!quiet) {
    const templates = companyTemplates(company);
    const body = renderTemplate(templates.initial_outreach, { company_name: company.name });
    await sendToCaller(db, company, lead.id as string, event.from, body, "initial_outreach");
    textSent = true;
  }

  const summary: LeadSummary = {
    id: lead.id as string,
    caller_phone: event.from,
    status: "new",
    answers: {},
    is_emergency: false,
  };
  await notifyOwner(db, company, summary, "new_lead");

  return { outcome: "lead_created", leadId: lead.id as string, textSent, quietHours: quiet };
}

export type InboundSmsResult =
  | { outcome: "duplicate" }
  | { outcome: "no_lead" }
  | { outcome: "processed"; leadId: string; replies: string[] };

/**
 * Process an inbound SMS through the state machine. Idempotent on MessageSid.
 */
export async function processInboundSms(
  db: SupabaseClient,
  company: CompanyRow,
  from: string,
  to: string,
  body: string,
  messageSid: string
): Promise<InboundSmsResult> {
  // Find the most recent lead for this caller (any age — people reply late).
  const { data: lead } = await db
    .from("leads")
    .select("id, status, conversation_stage, answers, unclear_count, inbound_count, is_emergency, caller_phone")
    .eq("company_id", company.id)
    .eq("caller_phone", from)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lead) return { outcome: "no_lead" };

  // Idempotency: record the inbound message first; a duplicate MessageSid aborts.
  const { error: msgErr } = await db.from("messages").insert({
    company_id: company.id,
    lead_id: lead.id,
    direction: "inbound",
    from_number: from,
    to_number: to,
    body,
    twilio_sid: messageSid,
    kind: "conversation",
  });
  if (msgErr) {
    if (msgErr.code === "23505") return { outcome: "duplicate" };
    throw new Error(`Failed to record inbound message: ${msgErr.message}`);
  }

  const state: ConversationState = {
    stage: lead.conversation_stage,
    answers: lead.answers ?? { notes: [] },
    unclearCount: lead.unclear_count ?? 0,
    inboundCount: lead.inbound_count ?? 0,
  };

  const templates = companyTemplates(company);
  const { state: nextState, actions } = handleInboundMessage(state, body, templates);

  // Persist new conversation state
  const leadUpdate: Record<string, unknown> = {
    conversation_stage: nextState.stage,
    answers: nextState.answers,
    unclear_count: nextState.unclearCount,
    inbound_count: nextState.inboundCount,
  };

  let newStatus: string | null = null;
  const replies: string[] = [];
  for (const action of actions) {
    if (action.type === "set_lead_status") newStatus = action.status;
  }
  if (nextState.stage === "emergency") leadUpdate.is_emergency = true;
  if (newStatus) leadUpdate.status = newStatus;

  if (newStatus === "opted_out") {
    await db.from("opt_outs").upsert({ company_id: company.id, phone: from });
  }

  await db.from("leads").update(leadUpdate).eq("id", lead.id).eq("company_id", company.id);

  const summary: LeadSummary = {
    id: lead.id as string,
    caller_phone: from,
    status: newStatus ?? (lead.status as string),
    answers: nextState.answers,
    is_emergency: nextState.stage === "emergency" || lead.is_emergency,
  };

  for (const action of actions) {
    if (action.type === "reply") {
      const kind = nextState.stage === "emergency" ? "emergency" : "conversation";
      await sendToCaller(db, company, lead.id as string, from, action.body, kind);
      replies.push(action.body);
    } else if (action.type === "notify_owner") {
      await notifyOwner(db, company, summary, action.reason);
    }
  }

  return { outcome: "processed", leadId: lead.id as string, replies };
}
