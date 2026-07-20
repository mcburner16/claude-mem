import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { getAdminClient } from "@/lib/supabase/admin";
import { companyTemplates, sendToCaller } from "@/lib/leads";
import { renderTemplate } from "@/lib/templates";
import { releaseDueOutreach, ClaimedOutreach } from "@/lib/scheduled-outreach";
import { CompanyRow } from "@/lib/notify";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Releases recovery texts that were scheduled during quiet hours and are now
 * due. Configure in vercel.json to run every 15 minutes, or call manually:
 *   curl -H "Authorization: Bearer $CRON_SECRET" .../api/cron/release-scheduled
 *
 * Double-send safety: claiming a due lead sets `outreach_sent_at` in the same
 * UPDATE and filters on it being null, so a lead can be claimed at most once
 * even across overlapping cron runs.
 */
export async function GET(req: NextRequest) {
  const env = getEnv();
  if (req.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminClient();
  const companyCache = new Map<string, CompanyRow | null>();

  const claimDue = async (now: Date): Promise<ClaimedOutreach[]> => {
    // Atomic claim: mark due, unsent, still-active leads as sent and return them.
    // PostgREST applies the filters then the update, and RETURNING gives us the
    // exact rows this call claimed — a concurrent run cannot claim the same row.
    const { data, error } = await db
      .from("leads")
      .update({ outreach_sent_at: now.toISOString() })
      .is("outreach_sent_at", null)
      .not("outreach_scheduled_for", "is", null)
      .lte("outreach_scheduled_for", now.toISOString())
      .neq("status", "opted_out")
      .select("id, company_id, caller_phone");
    if (error) throw new Error(`claimDue failed: ${error.message}`);
    return (data ?? []).map((r) => ({
      leadId: r.id as string,
      companyId: r.company_id as string,
      callerPhone: r.caller_phone as string,
    }));
  };

  const sendOutreach = async (lead: ClaimedOutreach): Promise<void> => {
    let company = companyCache.get(lead.companyId);
    if (company === undefined) {
      const { data } = await db.from("companies").select("*").eq("id", lead.companyId).maybeSingle();
      company = (data as CompanyRow | null) ?? null;
      companyCache.set(lead.companyId, company);
    }
    if (!company) return;
    // Re-check opt-out at send time (belt-and-suspenders alongside the status filter).
    const { data: optedOut } = await db
      .from("opt_outs")
      .select("phone")
      .eq("company_id", company.id)
      .eq("phone", lead.callerPhone)
      .maybeSingle();
    if (optedOut) return;

    const templates = companyTemplates(company);
    const body = renderTemplate(templates.initial_outreach, { company_name: company.name });
    await sendToCaller(db, company, lead.leadId, lead.callerPhone, body, "initial_outreach");
  };

  const result = await releaseDueOutreach({ claimDue, sendOutreach });
  return NextResponse.json({ ok: true, ...result });
}
