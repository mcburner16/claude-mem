"use client";

import { useState, useTransition } from "react";
import { updateLead } from "../../actions";

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

export function LeadControls(props: {
  leadId: string;
  status: string;
  internalNotes: string;
  appointmentAt: string | null;
  jobValueCents: number | null;
  jobValueIsEstimate: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function submit(form: HTMLFormElement) {
    const fd = new FormData(form);
    fd.set("leadId", props.leadId);
    startTransition(async () => {
      const res = await updateLead(fd);
      setMessage(res.error ? `Error: ${res.error}` : "Saved.");
      if (!res.error) setTimeout(() => setMessage(null), 2000);
    });
  }

  return (
    <section className="bg-white rounded-xl border border-slate-200 p-4">
      <h2 className="font-semibold mb-3">Update lead</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(e.currentTarget);
        }}
        className="space-y-3 text-sm"
      >
        <div>
          <label htmlFor="status" className="block text-slate-500 mb-1">Status</label>
          <select
            id="status"
            name="status"
            defaultValue={props.status}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="appointment_at" className="block text-slate-500 mb-1">Appointment (if booked)</label>
          <input
            id="appointment_at"
            type="datetime-local"
            name="appointment_at"
            defaultValue={props.appointmentAt ? props.appointmentAt.slice(0, 16) : ""}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="job_value_dollars" className="block text-slate-500 mb-1">Job value ($)</label>
            <input
              id="job_value_dollars"
              type="number"
              name="job_value_dollars"
              min="0"
              step="0.01"
              defaultValue={props.jobValueCents != null ? (props.jobValueCents / 100).toFixed(2) : ""}
              placeholder="e.g. 389.00"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="job_value_is_estimate" className="block text-slate-500 mb-1">Value type</label>
            <select
              id="job_value_is_estimate"
              name="job_value_is_estimate"
              defaultValue={String(props.jobValueIsEstimate)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="true">Estimate</option>
              <option value="false">Confirmed / actual</option>
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="internal_notes" className="block text-slate-500 mb-1">Internal notes (never sent to caller)</label>
          <textarea
            id="internal_notes"
            name="internal_notes"
            rows={3}
            defaultValue={props.internalNotes}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 font-medium"
          >
            {pending ? "Saving…" : "Save"}
          </button>
          {message && <span className="text-xs text-slate-500">{message}</span>}
        </div>
      </form>
    </section>
  );
}
