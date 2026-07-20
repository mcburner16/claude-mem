import { NextRequest, NextResponse } from "next/server";
import { authorizeDemo } from "../_lib";
import { getAdminClient } from "@/lib/supabase/admin";
import { processCallOutcome } from "@/lib/leads";
import { DEMO_SIMULATION_CALLERS } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

/**
 * Simulate an unanswered call to the demo company. Exercises the exact same
 * code path as the real Twilio dial-complete webhook — only the event source
 * differs. Body (optional JSON): { from?: string, dialStatus?: string, afterHours?: boolean }
 */
export async function POST(req: NextRequest) {
  const auth = await authorizeDemo(req);
  if (auth instanceof Response) return auth;

  let body: { from?: string; dialStatus?: string; afterHours?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine
  }

  const from =
    body.from ??
    DEMO_SIMULATION_CALLERS[Math.floor(Math.random() * DEMO_SIMULATION_CALLERS.length)];
  const dialStatus = body.dialStatus ?? "no-answer";
  if (!/^\+\d{10,15}$/.test(from)) {
    return NextResponse.json({ error: "from must be E.164, e.g. +14695550111" }, { status: 400 });
  }

  const db = getAdminClient();
  const result = await processCallOutcome(db, auth, {
    callSid: `SIMCALL_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    from,
    to: auth.twilio_number ?? "+10000000000",
    dialStatus,
    afterHours: body.afterHours ?? false,
    raw: { source: "demo_simulation" },
  });

  return NextResponse.json({ from, ...result });
}
