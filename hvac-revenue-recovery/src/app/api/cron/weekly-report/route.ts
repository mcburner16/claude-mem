import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { getAdminClient } from "@/lib/supabase/admin";
import { computeReportStats, renderWeeklyReportText } from "@/lib/reporting";
import { sendEmail } from "@/lib/notify";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Weekly report job. Configure in vercel.json to run Monday mornings, or call
 * manually: curl -H "Authorization: Bearer $CRON_SECRET" .../api/cron/weekly-report
 * Demo companies get stats computed but no real email.
 */
export async function GET(req: NextRequest) {
  const env = getEnv();
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getAdminClient();
  const { data: companies } = await db.from("companies").select("*");

  const end = new Date();
  const start = new Date(end.getTime() - 7 * 24 * 3600 * 1000);
  const results: Array<{ company: string; sent: number; errors: string[] }> = [];

  for (const company of companies ?? []) {
    const stats = await computeReportStats(db, company.id, start, end);
    const text = renderWeeklyReportText(company.name, stats);
    const errors: string[] = [];
    let sent = 0;
    for (const to of company.notify_emails ?? []) {
      if (company.is_demo || env.DRY_RUN) {
        sent++;
        continue;
      }
      const r = await sendEmail({
        to,
        subject: `Weekly missed-call recovery report — ${company.name}`,
        text,
      });
      if (r.error) errors.push(`${to}: ${r.error}`);
      else sent++;
    }
    results.push({ company: company.name, sent, errors });
  }

  return NextResponse.json({ ok: true, period: { start, end }, results });
}
