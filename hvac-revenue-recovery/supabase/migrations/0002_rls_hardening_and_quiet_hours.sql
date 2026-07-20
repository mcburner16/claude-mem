-- 0002 — RLS hardening + quiet-hours release modes
-- Run AFTER 0001_init.sql. Safe to run on an already-seeded database.

-- =====================================================================
-- Part A: RLS hardening
--
-- Supabase grants table privileges to the `authenticated` role by default,
-- and the anon key is public, so a logged-in user can call PostgREST directly
-- (bypassing our server actions). Two gaps are closed here:
--   1. UPDATE policies had only USING (checks the OLD row), no WITH CHECK
--      (checks the NEW row) — so a user could reassign a row's company_id to
--      another tenant. WITH CHECK closes that.
--   2. UPDATE was allowed on every column. We revoke blanket UPDATE and grant
--      it only on the columns the dashboard legitimately edits, so identity/
--      routing/flag columns (company_id, is_demo, twilio_number, slug, …) are
--      not client-writable at all.
-- =====================================================================

-- ---- leads ----
drop policy if exists leads_update on public.leads;
create policy leads_update on public.leads
  for update
  using (company_id in (select public.user_company_ids()))
  with check (company_id in (select public.user_company_ids()));

revoke update on public.leads from anon, authenticated;
grant update (
  status,
  internal_notes,
  appointment_at,
  job_value_cents,
  job_value_is_estimate,
  conversation_stage
) on public.leads to authenticated;
-- (The conversation state machine and lead creation run via the service-role
--  key, which is unaffected by these column grants.)

-- ---- companies ----
drop policy if exists companies_update on public.companies;
create policy companies_update on public.companies
  for update
  using (id in (select public.user_company_ids()))
  with check (id in (select public.user_company_ids()));

revoke update on public.companies from anon, authenticated;
grant update (
  name,
  timezone,
  forward_to_number,
  dial_timeout_seconds,
  after_hours_forwarding,
  business_hours,
  quiet_hours_start,
  quiet_hours_end,
  templates,
  emergency_response_reviewed,
  notify_sms_numbers,
  notify_emails,
  notify_on,
  brand,
  consent_wording,
  data_retention_days,
  avg_job_value_cents,
  a2p_registration
) on public.companies to authenticated;
-- Deliberately NOT grantable by clients: id, created_at, slug, is_demo,
-- twilio_number (routing/identity), quiet_hours_mode is added below and granted.

-- ---- rate limiter: service-role only ----
-- SECURITY DEFINER functions in the public schema are callable by anon/
-- authenticated over PostgREST RPC unless revoked. Lock it down so a caller
-- cannot pre-inflate a company/phone counter to suppress recovery texts.
revoke all on function public.increment_rate_limit(text, int) from public, anon, authenticated;
grant execute on function public.increment_rate_limit(text, int) to service_role;

-- =====================================================================
-- Part B: quiet-hours release modes
--
-- Per-company behavior when a missed call lands during quiet hours:
--   immediate    — send the recovery text right away (business accepts
--                  responsibility for contact timing / consent)
--   schedule     — hold the text and release it at the next permitted time
--   notify_only  — never auto-text the caller; create the lead + alert staff
--
-- The lead is always created and staff always notified, so no lead is lost.
-- Each business MUST review its communication and consent policy before
-- choosing a mode (surfaced in Settings and the compliance checklist).
-- =====================================================================

alter table public.companies
  add column if not exists quiet_hours_mode text not null default 'schedule'
    check (quiet_hours_mode in ('immediate', 'schedule', 'notify_only'));

grant update (quiet_hours_mode) on public.companies to authenticated;

alter table public.leads
  add column if not exists outreach_scheduled_for timestamptz,
  add column if not exists outreach_sent_at timestamptz;

-- Partial index for the release job: only unsent, scheduled rows.
create index if not exists leads_outreach_due_idx
  on public.leads (outreach_scheduled_for)
  where outreach_sent_at is null and outreach_scheduled_for is not null;

-- Demo company sends immediately for smooth sales demos.
update public.companies set quiet_hours_mode = 'immediate' where is_demo = true;
