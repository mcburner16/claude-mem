import { SupabaseClient } from "@supabase/supabase-js";

export interface ReportStats {
  periodStart: string;
  periodEnd: string;
  missedCalls: number;
  textsSent: number;
  callersResponded: number;
  qualifiedLeads: number;
  appointmentsBooked: number;
  jobsWon: number;
  responseRate: number; // 0..1 of leads contacted who replied
  confirmedRevenueCents: number; // job_won with non-estimate value
  estimatedRevenueCents: number; // job_won/appointment with estimated value
  unreportedLeadCount: number; // qualified+ leads with no value recorded
}

/**
 * Compute report stats for a company over [start, end).
 * Revenue is never invented: confirmed = values the company marked as actual;
 * estimated = values the company marked as estimates; everything else is
 * reported as a count of leads with unreported value.
 */
export async function computeReportStats(
  db: SupabaseClient,
  companyId: string,
  start: Date,
  end: Date
): Promise<ReportStats> {
  const startIso = start.toISOString();
  const endIso = end.toISOString();

  const { count: missedCalls } = await db
    .from("calls")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("answered", false)
    .gte("created_at", startIso)
    .lt("created_at", endIso);

  const { count: textsSent } = await db
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("direction", "outbound")
    .gte("created_at", startIso)
    .lt("created_at", endIso);

  const { data: leads } = await db
    .from("leads")
    .select("id, status, inbound_count, job_value_cents, job_value_is_estimate, appointment_at")
    .eq("company_id", companyId)
    .gte("created_at", startIso)
    .lt("created_at", endIso);

  const all = leads ?? [];
  const responded = all.filter((l) => (l.inbound_count ?? 0) > 0);
  const qualifiedOrBetter = all.filter((l) =>
    ["qualified", "appointment_booked", "job_won"].includes(l.status)
  );
  const appointments = all.filter((l) => ["appointment_booked", "job_won"].includes(l.status));
  const won = all.filter((l) => l.status === "job_won");

  const confirmedRevenueCents = won
    .filter((l) => l.job_value_cents != null && !l.job_value_is_estimate)
    .reduce((sum, l) => sum + (l.job_value_cents ?? 0), 0);
  const estimatedRevenueCents = all
    .filter(
      (l) =>
        l.job_value_cents != null &&
        l.job_value_is_estimate &&
        ["appointment_booked", "job_won"].includes(l.status)
    )
    .reduce((sum, l) => sum + (l.job_value_cents ?? 0), 0);
  const unreportedLeadCount = qualifiedOrBetter.filter((l) => l.job_value_cents == null).length;

  return {
    periodStart: startIso,
    periodEnd: endIso,
    missedCalls: missedCalls ?? 0,
    textsSent: textsSent ?? 0,
    callersResponded: responded.length,
    qualifiedLeads: qualifiedOrBetter.length,
    appointmentsBooked: appointments.length,
    jobsWon: won.length,
    responseRate: all.length ? responded.length / all.length : 0,
    confirmedRevenueCents,
    estimatedRevenueCents,
    unreportedLeadCount,
  };
}

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function renderWeeklyReportText(companyName: string, s: ReportStats): string {
  const pct = Math.round(s.responseRate * 100);
  return [
    `Weekly Missed-Call Recovery Report — ${companyName}`,
    `Period: ${s.periodStart.slice(0, 10)} to ${s.periodEnd.slice(0, 10)}`,
    ``,
    `Missed calls captured:   ${s.missedCalls}`,
    `Recovery texts sent:     ${s.textsSent}`,
    `Callers who responded:   ${s.callersResponded} (${pct}% of new leads)`,
    `Qualified leads:         ${s.qualifiedLeads}`,
    `Appointments booked:     ${s.appointmentsBooked}`,
    `Jobs won:                ${s.jobsWon}`,
    ``,
    `Revenue recovered:`,
    `  Confirmed (actual values you entered):  ${formatCents(s.confirmedRevenueCents)}`,
    `  Estimated (values marked estimate):     ${formatCents(s.estimatedRevenueCents)}`,
    `  Leads with no value recorded yet:       ${s.unreportedLeadCount}`,
    ``,
    `Tip: record job values on each lead so this report reflects real recovered revenue.`,
  ].join("\n");
}
