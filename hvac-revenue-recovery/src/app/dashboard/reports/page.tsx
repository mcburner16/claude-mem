import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/supabase/server";
import { computeReportStats, formatCents } from "@/lib/reporting";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { days?: string };
}) {
  const session = await getSessionContext();
  if (!session) redirect("/login");

  const days = Math.min(Math.max(Number(searchParams.days) || 7, 1), 90);
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 3600 * 1000);
  const stats = await computeReportStats(session.supabase, session.companyId, start, end);
  const pct = Math.round(stats.responseRate * 100);

  const rows: Array<[string, string | number]> = [
    ["Missed calls captured", stats.missedCalls],
    ["Recovery texts sent", stats.textsSent],
    ["Callers who responded", `${stats.callersResponded} (${pct}% of new leads)`],
    ["Qualified leads", stats.qualifiedLeads],
    ["Appointments booked", stats.appointmentsBooked],
    ["Jobs won", stats.jobsWon],
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold">Reports</h1>
        <div className="flex gap-2 text-sm">
          {[7, 30, 90].map((d) => (
            <a
              key={d}
              href={`/dashboard/reports?days=${d}`}
              className={`px-3 py-1.5 rounded-lg border ${
                days === d
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white border-slate-300 hover:bg-slate-50"
              }`}
            >
              {d} days
            </a>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="text-slate-500">{k}</span>
            <span className="font-semibold">{v}</span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2 text-sm">
        <h2 className="font-semibold">Recovered revenue</h2>
        <div className="flex justify-between">
          <span className="text-slate-500">Confirmed (actual values entered on won jobs)</span>
          <span className="font-semibold text-green-700">{formatCents(stats.confirmedRevenueCents)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Estimated (values marked as estimates)</span>
          <span className="font-semibold text-emerald-600">{formatCents(stats.estimatedRevenueCents)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Qualified+ leads with no value recorded</span>
          <span className="font-semibold">{stats.unreportedLeadCount}</span>
        </div>
        <p className="text-xs text-slate-400 pt-2 border-t border-slate-100">
          Revenue figures come only from values your team enters on each lead. Nothing is inferred or
          invented. A weekly version of this report is emailed every Monday to the addresses in
          Settings → Notifications.
        </p>
      </div>
    </div>
  );
}
