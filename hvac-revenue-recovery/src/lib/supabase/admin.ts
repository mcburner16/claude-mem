import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "../env";

/**
 * Service-role client for webhook handlers and server-side jobs.
 * Bypasses RLS — use ONLY in server code paths that scope every query by
 * company_id themselves (webhooks, cron, demo endpoints).
 */
let admin: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (admin) return admin;
  const env = getEnv();
  admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}
