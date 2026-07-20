import { NextRequest } from "next/server";
import { getEnv } from "@/lib/env";
import { getSessionContext } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { getOrCreateDemoCompany } from "@/lib/demo";
import { CompanyRow } from "@/lib/notify";

/**
 * Demo endpoints are callable by (a) a signed-in dashboard user who belongs to
 * the demo company, or (b) any caller presenting the DEMO_SECRET header
 * (useful for curl during a sales demo setup). They only ever touch the demo
 * company's data.
 */
export async function authorizeDemo(req: NextRequest): Promise<CompanyRow | Response> {
  const env = getEnv();
  const db = getAdminClient();
  const demoCompany = await getOrCreateDemoCompany(db);

  const secret = req.headers.get("x-demo-secret");
  if (secret && secret === env.DEMO_SECRET) return demoCompany;

  const session = await getSessionContext();
  if (session && session.companyId === demoCompany.id) return demoCompany;

  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}
