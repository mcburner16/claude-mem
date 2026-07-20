import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

const STATUSES = [
  "new",
  "contacted",
  "qualified",
  "appointment_booked",
  "job_won",
  "closed_lost",
  "spam",
  "opted_out",
];

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string };
}) {
  const session = await getSessionContext();
  if (!session) redirect("/login");
  const { supabase, companyId } = session;

  let query = supabase
    .from("leads")
    .select("id, caller_phone, status, answers, created_at, is_emergency, conversation_stage")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (searchParams.status && STATUSES.includes(searchParams.status)) {
    query = query.eq("status", searchParams.status);
  }
  const { data } = await query;
  let leads = data ?? [];

  // Client-side-ish free-text filter (name/phone/issue) — fine at MVP scale.
  const q = searchParams.q?.trim().toLowerCase();
  if (q) {
    leads = leads.filter((l) => {
      const a = l.answers as { name?: string; issue?: string; zip?: string };
      return [l.caller_phone, a?.name, a?.issue, a?.zip]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold">Leads</h1>
        <form className="flex gap-2" action="/dashboard/leads" method="get">
          <input
            type="text"
            name="q"
            defaultValue={searchParams.q ?? ""}
            placeholder="Search name, phone, issue, ZIP"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm w-56"
          />
          <select
            name="status"
            defaultValue={searchParams.status ?? ""}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <button className="bg-brand-600 hover:bg-brand-700 text-white rounded-lg px-3 py-1.5 text-sm">
            Filter
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {leads.map((l) => {
          const a = l.answers as { name?: string; issue?: string; zip?: string; urgency?: string };
          return (
            <Link
              key={l.id}
              href={`/dashboard/leads/${l.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
            >
              <div className="min-w-0">
                <div className="font-medium text-sm">
                  {l.is_emergency && <span className="text-red-600 mr-1">⚠️</span>}
                  {a?.name ?? "Unknown caller"}{" "}
                  <span className="text-slate-400 font-normal">{l.caller_phone}</span>
                </div>
                <div className="text-xs text-slate-500 truncate max-w-md">
                  {a?.issue ?? "No details yet"}
                  {a?.zip ? ` · ZIP ${a.zip}` : ""}
                  {a?.urgency ? ` · ${a.urgency}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-slate-400 hidden sm:inline">
                  {new Date(l.created_at).toLocaleDateString()}
                </span>
                <StatusBadge status={l.status} />
              </div>
            </Link>
          );
        })}
        {leads.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-slate-400">No leads match.</div>
        )}
      </div>
    </div>
  );
}
