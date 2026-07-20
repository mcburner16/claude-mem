import { NextRequest, NextResponse } from "next/server";
import { authorizeDemo } from "../_lib";
import { getAdminClient } from "@/lib/supabase/admin";
import { resetDemoData } from "@/lib/demo";

export const dynamic = "force-dynamic";

/** Wipe and re-seed the demo company's data. Only ever touches the demo company. */
export async function POST(req: NextRequest) {
  const auth = await authorizeDemo(req);
  if (auth instanceof Response) return auth;

  const db = getAdminClient();
  const result = await resetDemoData(db);
  return NextResponse.json({ ok: true, seeded_leads: result.leads });
}
