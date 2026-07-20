const STYLES: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-cyan-100 text-cyan-800",
  qualified: "bg-emerald-100 text-emerald-800",
  appointment_booked: "bg-violet-100 text-violet-800",
  job_won: "bg-green-100 text-green-800",
  closed_lost: "bg-slate-100 text-slate-600",
  spam: "bg-orange-100 text-orange-800",
  opted_out: "bg-red-100 text-red-800",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${STYLES[status] ?? "bg-slate-100 text-slate-600"}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
