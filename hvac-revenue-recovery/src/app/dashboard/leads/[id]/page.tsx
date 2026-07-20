import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionContext } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/StatusBadge";
import { LeadControls } from "./LeadControls";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const session = await getSessionContext();
  if (!session) redirect("/login");
  const { supabase, companyId } = session;

  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("id", params.id)
    .eq("company_id", companyId)
    .maybeSingle();
  if (!lead) notFound();

  const { data: messages } = await supabase
    .from("messages")
    .select("id, direction, body, created_at, kind, send_error")
    .eq("lead_id", lead.id)
    .order("created_at", { ascending: true });

  const a = (lead.answers ?? {}) as {
    name?: string;
    issue?: string;
    system_down?: boolean;
    urgency?: string;
    zip?: string;
    callback_time?: string;
    notes?: string[];
  };

  const facts: Array<[string, string]> = [
    ["Phone", lead.caller_phone],
    ["Name", a.name ?? "—"],
    ["Issue", a.issue ?? "—"],
    ["System down", a.system_down === undefined ? "—" : a.system_down ? "YES" : "No"],
    ["Urgency", a.urgency ?? "—"],
    ["ZIP", a.zip ?? "—"],
    ["Callback preference", a.callback_time ?? "—"],
    ["Conversation stage", lead.conversation_stage.replace(/_/g, " ")],
    ["Created", new Date(lead.created_at).toLocaleString()],
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <Link href="/dashboard/leads" className="text-sm text-brand-600 hover:underline">
            ← All leads
          </Link>
          <h1 className="text-xl font-bold mt-1">
            {lead.is_emergency && <span className="text-red-600 mr-1">⚠️</span>}
            {a.name ?? lead.caller_phone}
          </h1>
        </div>
        <StatusBadge status={lead.status} />
      </div>

      {lead.is_emergency && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 text-sm">
          <strong>Emergency language was detected in this conversation.</strong> The caller was sent
          the emergency safety response and automation stopped. Call them directly.
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <section className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="font-semibold mb-3">Lead details</h2>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              {facts.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            {(a.notes ?? []).length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="text-xs font-semibold text-slate-500 mb-1">System notes</div>
                <ul className="text-xs text-slate-600 space-y-1 list-disc pl-4">
                  {a.notes!.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <LeadControls
            leadId={lead.id}
            status={lead.status}
            internalNotes={lead.internal_notes}
            appointmentAt={lead.appointment_at}
            jobValueCents={lead.job_value_cents}
            jobValueIsEstimate={lead.job_value_is_estimate}
          />
        </div>

        <section className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="font-semibold mb-3">Conversation</h2>
          <div className="space-y-2 max-h-[32rem] overflow-y-auto pr-1">
            {(messages ?? []).map((m) => (
              <div
                key={m.id}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  m.direction === "outbound"
                    ? "ml-auto bg-brand-600 text-white"
                    : "bg-slate-100 text-slate-900"
                } ${m.kind === "emergency" ? "ring-2 ring-red-400" : ""}`}
              >
                <div className="whitespace-pre-wrap">{m.body}</div>
                <div
                  className={`text-[10px] mt-1 ${m.direction === "outbound" ? "text-blue-200" : "text-slate-400"}`}
                >
                  {new Date(m.created_at).toLocaleString()}
                  {m.send_error ? ` · NOT SENT: ${m.send_error}` : ""}
                </div>
              </div>
            ))}
            {(messages ?? []).length === 0 && (
              <div className="text-sm text-slate-400 py-6 text-center">No messages yet.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
