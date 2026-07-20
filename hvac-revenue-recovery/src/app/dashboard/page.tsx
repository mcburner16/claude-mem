import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/supabase/server";
import { computeReportStats, formatCents } from "@/lib/reporting";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const session = await getSessionContext();
  if (!session) redirect("/login");
  const { supabase, companyId } = session;

  const end = new Date();
  const start = new Date(end.getTime() - 7 * 24 * 3600 * 1000);
  // RLS-scoped client: stats only ever cover this user's company.
  const stats = await computeReportStats(supabase, companyId, start, end);

  const { data: recentLeads } = await supabase
    .from("leads")
    .select("id, caller_phone, status, answers, created_at, is_emergency")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(8);

  const tiles = [
    { label: "Missed calls (7d)", value: stats.missedCalls },
    { label: "Texts sent (7d)", value: stats.textsSent },
    { label: "Callers responded", value: stats.callersResponded },
    { label: "Qualified leads", value: stats.qualifiedLeads },
    { label: "Appointments booked", value: stats.appointmentsBooked },
    { label: "Jobs won", value: stats.jobsWon },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Last 7 days</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-2xl font-bold">{t.value}</div>
            <div className="text-xs text-slate-500 mt-1">{t.label}</div>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-lg font-bold text-green-700">{formatCents(stats.confirmedRevenueCents)}</div>
          <div className="text-xs text-slate-500 mt-1">Confirmed recovered revenue (actual values entered)</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-lg font-bold text-emerald-600">{formatCents(stats.estimatedRevenueCents)}</div>
          <div className="text-xs text-slate-500 mt-1">Estimated revenue (marked as estimates)</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-lg font-bold text-slate-600">{stats.unreportedLeadCount}</div>
          <div className="text-xs text-slate-500 mt-1">Qualified+ leads with no value recorded yet</div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Recent leads</h2>
          <Link href="/dashboard/leads" className="text-sm text-brand-600 hover:underline">
            View all →
          </Link>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {(recentLeads ?? []).map((l) => (
            <Link
              key={l.id}
              href={`/dashboard/leads/${l.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
            >
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">
                  {l.is_emergency && <span className="text-red-600 mr-1">⚠️</span>}
                  {(l.answers as { name?: string })?.name ?? l.caller_phone}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {(l.answers as { issue?: string })?.issue ?? "No details yet"}
                </div>
              </div>
              <StatusBadge status={l.status} />
            </Link>
          ))}
          {(recentLeads ?? []).length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-slate-400">
              No leads yet. Missed calls will appear here automatically.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
