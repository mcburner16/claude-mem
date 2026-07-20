import { SupabaseClient } from "@supabase/supabase-js";
import { DEMO_COMPANY, DEMO_COMPANY_SLUG, DEMO_LEADS } from "./demo-data";
import { CompanyRow } from "./notify";

/** Fetch (or create) the demo company. */
export async function getOrCreateDemoCompany(db: SupabaseClient): Promise<CompanyRow> {
  const { data: existing } = await db
    .from("companies")
    .select("*")
    .eq("slug", DEMO_COMPANY_SLUG)
    .maybeSingle();
  if (existing) return existing as CompanyRow;

  const { data: created, error } = await db
    .from("companies")
    .insert(DEMO_COMPANY)
    .select("*")
    .single();
  if (error || !created) throw new Error(`Failed to create demo company: ${error?.message}`);
  return created as CompanyRow;
}

/** Wipe all demo-company data and re-seed the canonical demo leads. */
export async function resetDemoData(db: SupabaseClient): Promise<{ leads: number }> {
  const company = await getOrCreateDemoCompany(db);

  // Order matters only for clarity; FKs cascade from leads/calls.
  await db.from("messages").delete().eq("company_id", company.id);
  await db.from("notifications").delete().eq("company_id", company.id);
  await db.from("leads").delete().eq("company_id", company.id);
  await db.from("calls").delete().eq("company_id", company.id);
  await db.from("opt_outs").delete().eq("company_id", company.id);
  await db.from("audit_log").delete().eq("company_id", company.id);

  const now = Date.now();
  for (const seed of DEMO_LEADS) {
    const createdAt = new Date(now - seed.created_hours_ago * 3600 * 1000).toISOString();
    const callSid = `DEMOCALL_${seed.caller_phone.slice(-4)}_${seed.created_hours_ago}`;

    const { data: call } = await db
      .from("calls")
      .insert({
        company_id: company.id,
        call_sid: callSid,
        from_number: seed.caller_phone,
        to_number: company.twilio_number,
        dial_status: "no-answer",
        answered: false,
        after_hours: seed.caller_phone === "+12145550183",
        created_at: createdAt,
        raw: { source: "demo_seed" },
      })
      .select("id")
      .single();

    const { data: lead, error } = await db
      .from("leads")
      .insert({
        company_id: company.id,
        caller_phone: seed.caller_phone,
        source_call_id: call?.id ?? null,
        status: seed.status,
        conversation_stage: seed.conversation_stage,
        answers: seed.answers,
        is_emergency: seed.is_emergency ?? false,
        internal_notes: seed.internal_notes ?? "",
        job_value_cents: seed.job_value_cents ?? null,
        job_value_is_estimate: seed.job_value_is_estimate ?? true,
        appointment_at: seed.appointment_at_offset_hours
          ? new Date(now + seed.appointment_at_offset_hours * 3600 * 1000).toISOString()
          : null,
        created_at: createdAt,
        inbound_count: seed.messages.filter((m) => m.direction === "inbound").length,
      })
      .select("id")
      .single();
    if (error || !lead) throw new Error(`Demo seed failed: ${error?.message}`);

    let t = new Date(createdAt).getTime();
    for (const msg of seed.messages) {
      t += 60_000; // one minute between messages
      await db.from("messages").insert({
        company_id: company.id,
        lead_id: lead.id,
        direction: msg.direction,
        from_number: msg.direction === "inbound" ? seed.caller_phone : company.twilio_number,
        to_number: msg.direction === "inbound" ? company.twilio_number : seed.caller_phone,
        body: msg.body,
        kind: msg.kind ?? "conversation",
        created_at: new Date(t).toISOString(),
        twilio_sid: `DEMOMSG_${lead.id}_${t}`,
      });
    }
  }

  return { leads: DEMO_LEADS.length };
}
