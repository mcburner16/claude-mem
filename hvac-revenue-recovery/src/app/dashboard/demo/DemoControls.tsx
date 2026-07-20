"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Sales-demo control panel. Drives the same server code paths as real Twilio
 * webhooks, via the /api/demo endpoints (authorized by the demo-company session).
 */
export function DemoControls() {
  const router = useRouter();
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [caller, setCaller] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  const append = (s: string) => setLog((l) => [...l.slice(-19), s]);

  async function call(path: string, body?: unknown): Promise<Record<string, unknown> | null> {
    setBusy(true);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json();
      if (!res.ok) {
        append(`✗ ${path}: ${json.error ?? res.status}`);
        return null;
      }
      return json;
    } catch (e) {
      append(`✗ ${path}: ${e instanceof Error ? e.message : "failed"}`);
      return null;
    } finally {
      setBusy(false);
      router.refresh();
    }
  }

  async function simulateMissedCall() {
    const r = await call("/api/demo/simulate-call");
    if (!r) return;
    setCaller(r.from as string);
    if (r.outcome === "lead_created") {
      append(`📞 Missed call from ${r.from} → lead created, recovery text ${r.textSent ? "sent" : "held (quiet hours)"}`);
    } else {
      append(`📞 Call from ${r.from} → ${r.outcome}`);
    }
  }

  async function sendReply(text?: string) {
    if (!caller) {
      append("✗ Simulate a missed call first.");
      return;
    }
    const body = text ?? reply;
    if (!body.trim()) return;
    const r = await call("/api/demo/simulate-reply", { from: caller, body });
    if (!r) return;
    append(`💬 Caller: "${body}"`);
    for (const rep of (r.replies as string[]) ?? []) {
      append(`🤖 System: "${rep.slice(0, 120)}${rep.length > 120 ? "…" : ""}"`);
    }
    setReply("");
  }

  async function reset() {
    const r = await call("/api/demo/reset");
    if (r) {
      append(`♻️ Demo data reset (${r.seeded_leads} sample leads restored).`);
      setCaller(null);
    }
  }

  const script: Array<[string, string]> = [
    ["YES", "Consent"],
    ["Sarah Jones", "Name"],
    ["AC is running but not cooling", "Issue"],
    ["Yes", "System down"],
    ["Today if possible", "Urgency"],
    ["75201", "ZIP"],
    ["As soon as possible", "Callback"],
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold">Demo controls</h1>
        <p className="text-sm text-slate-500 mt-1">
          Everything here runs the exact same code as the live Twilio webhooks — only the phone
          network is simulated. Open the Leads tab in another window to show updates live.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <button
          onClick={simulateMissedCall}
          disabled={busy}
          className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl p-4 text-left"
        >
          <div className="font-semibold">1. Simulate missed call</div>
          <div className="text-xs text-blue-200 mt-1">Creates a lead + sends the recovery text</div>
        </button>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="font-semibold text-sm">2. Caller replies</div>
          <div className="flex gap-2 mt-2">
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendReply()}
              placeholder={caller ? `Text from ${caller}` : "Simulate a call first"}
              className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm min-w-0"
            />
            <button
              onClick={() => sendReply()}
              disabled={busy || !caller}
              className="bg-slate-800 text-white rounded-lg px-3 text-sm disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
        <button
          onClick={reset}
          disabled={busy}
          className="bg-white hover:bg-slate-50 border border-slate-300 rounded-xl p-4 text-left disabled:opacity-50"
        >
          <div className="font-semibold">Reset demo data</div>
          <div className="text-xs text-slate-500 mt-1">Restore the 7 seeded sample leads</div>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h2 className="font-semibold text-sm mb-2">Quick script (click in order after simulating a call)</h2>
        <div className="flex flex-wrap gap-2">
          {script.map(([text, label]) => (
            <button
              key={label}
              onClick={() => sendReply(text)}
              disabled={busy || !caller}
              className="text-xs bg-slate-100 hover:bg-slate-200 rounded-full px-3 py-1.5 disabled:opacity-50"
            >
              {label}: “{text}”
            </button>
          ))}
          <button
            onClick={() => sendReply("I smell gas near the furnace")}
            disabled={busy || !caller}
            className="text-xs bg-red-100 hover:bg-red-200 text-red-800 rounded-full px-3 py-1.5 disabled:opacity-50"
          >
            ⚠️ Emergency: “I smell gas near the furnace”
          </button>
        </div>
      </div>

      <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-xs space-y-1 min-h-[8rem]">
        {log.length === 0 && <div className="text-slate-500">Event log…</div>}
        {log.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  );
}
