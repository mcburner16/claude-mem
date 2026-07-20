import { NextRequest, NextResponse } from "next/server";
import { authorizeDemo } from "../_lib";
import { getAdminClient } from "@/lib/supabase/admin";
import { processInboundSms } from "@/lib/leads";

export const dynamic = "force-dynamic";

/**
 * Simulate the caller texting back. Runs the real state machine.
 * Body: { from: string, body: string }
 */
export async function POST(req: NextRequest) {
  const auth = await authorizeDemo(req);
  if (auth instanceof Response) return auth;

  let payload: { from?: string; body?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON body required: { from, body }" }, { status: 400 });
  }
  if (!payload.from || !payload.body) {
    return NextResponse.json({ error: "from and body are required" }, { status: 400 });
  }

  const db = getAdminClient();
  const result = await processInboundSms(
    db,
    auth,
    payload.from,
    auth.twilio_number ?? "+10000000000",
    payload.body,
    `SIMMSG_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  );

  return NextResponse.json(result);
}
