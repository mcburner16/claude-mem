-- HVAC Revenue Recovery — initial schema
-- Multi-tenant: every row is scoped by company_id; RLS restricts dashboard
-- users to their own company. Webhooks use the service-role key and scope
-- queries explicitly.

create extension if not exists "pgcrypto";

-- ============ companies ============
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  slug text not null unique,
  is_demo boolean not null default false,
  timezone text not null default 'America/Chicago',

  -- Telephony
  twilio_number text unique,           -- E.164 tracking number, e.g. +12145550100
  forward_to_number text,              -- company's real line, E.164
  dial_timeout_seconds int not null default 20,  -- must beat their voicemail pickup
  after_hours_forwarding boolean not null default true, -- still ring the real line after hours?

  -- Business hours & quiet hours
  business_hours jsonb not null default '{}'::jsonb,
  quiet_hours_start text not null default '21:00',
  quiet_hours_end text not null default '08:00',

  -- Messaging templates ({{company_name}}, {{name}} variables)
  templates jsonb not null default '{}'::jsonb,
  -- Emergency wording requires company review before going live
  emergency_response_reviewed boolean not null default false,

  -- Notifications
  notify_sms_numbers text[] not null default '{}',   -- owner/dispatcher cell numbers
  notify_emails text[] not null default '{}',
  notify_on jsonb not null default '{"responded": true, "qualified": true, "emergency": true, "needs_human": true}'::jsonb,

  -- Branding / identity (used in messages and reports)
  brand jsonb not null default '{}'::jsonb,  -- {website, city, license_number, ...}

  -- Compliance
  a2p_registration jsonb not null default '{}'::jsonb, -- brand/campaign SIDs, EIN status, notes
  consent_wording text,               -- reviewed consent language for the outreach text
  data_retention_days int not null default 730,

  -- Reporting
  avg_job_value_cents int not null default 45000  -- used ONLY for "unreported lead value" estimates, labeled as estimate
);

-- ============ company_users ============
create table public.company_users (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'dispatcher', 'admin')),
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

-- ============ calls ============
create table public.calls (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  created_at timestamptz not null default now(),
  call_sid text not null,              -- Twilio CallSid (idempotency key)
  from_number text not null,
  to_number text not null,
  dial_status text,                    -- completed | no-answer | busy | failed | canceled
  answered boolean,
  after_hours boolean not null default false,
  duration_seconds int,
  raw jsonb not null default '{}'::jsonb,
  unique (company_id, call_sid)
);

-- ============ leads ============
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  caller_phone text not null,          -- E.164
  source_call_id uuid references public.calls(id),
  status text not null default 'new' check (status in
    ('new','contacted','qualified','appointment_booked','job_won','closed_lost','spam','opted_out')),

  -- Conversation state machine
  conversation_stage text not null default 'initial_outreach',
  answers jsonb not null default '{}'::jsonb,      -- {name, issue, system_down, urgency, zip, callback_time, notes[]}
  unclear_count int not null default 0,
  inbound_count int not null default 0,

  -- Manually-entered outcome tracking (revenue attribution is manual in the MVP)
  appointment_at timestamptz,
  job_value_cents int,                 -- confirmed value when job_won
  job_value_is_estimate boolean not null default true,
  internal_notes text not null default '',

  is_emergency boolean not null default false
);

create index leads_company_created_idx on public.leads (company_id, created_at desc);
create index leads_company_phone_idx on public.leads (company_id, caller_phone);
create index leads_company_status_idx on public.leads (company_id, status);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger leads_updated_at before update on public.leads
  for each row execute function public.set_updated_at();

-- ============ messages ============
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  created_at timestamptz not null default now(),
  direction text not null check (direction in ('inbound','outbound')),
  from_number text not null,
  to_number text not null,
  body text not null,
  twilio_sid text,                     -- MessageSid (idempotency for inbound)
  kind text not null default 'conversation' check (kind in
    ('conversation','initial_outreach','notification','emergency','system')),
  send_error text
);

create unique index messages_company_sid_idx on public.messages (company_id, twilio_sid)
  where twilio_sid is not null;
create index messages_lead_idx on public.messages (lead_id, created_at);

-- ============ opt_outs ============
create table public.opt_outs (
  company_id uuid not null references public.companies(id) on delete cascade,
  phone text not null,
  created_at timestamptz not null default now(),
  primary key (company_id, phone)
);

-- ============ notifications (log of owner alerts) ============
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  created_at timestamptz not null default now(),
  reason text not null,                -- responded | qualified | emergency | needs_human | new_lead
  channel text not null,               -- sms | email
  recipient text not null,
  success boolean not null default true,
  error text
);

-- ============ audit_log ============
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  created_at timestamptz not null default now(),
  actor text not null,                 -- user id, 'system', or 'webhook'
  action text not null,                -- e.g. lead.status_changed, settings.updated
  target_id uuid,
  detail jsonb not null default '{}'::jsonb
);

-- ============ rate_limits (simple fixed-window counters) ============
create table public.rate_limits (
  key text primary key,                -- e.g. 'sms:{company_id}:{phone}:{hour-bucket}'
  count int not null default 0,
  window_start timestamptz not null default now()
);

-- Atomic increment helper for rate limiting
create or replace function public.increment_rate_limit(p_key text, p_window_seconds int)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  insert into rate_limits (key, count, window_start)
  values (p_key, 1, now())
  on conflict (key) do update set
    count = case
      when rate_limits.window_start < now() - make_interval(secs => p_window_seconds) then 1
      else rate_limits.count + 1
    end,
    window_start = case
      when rate_limits.window_start < now() - make_interval(secs => p_window_seconds) then now()
      else rate_limits.window_start
    end
  returning count into v_count;
  return v_count;
end $$;

-- ============ Row-Level Security ============
-- Helper: company ids the current user belongs to
create or replace function public.user_company_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select company_id from company_users where user_id = auth.uid();
$$;

alter table public.companies enable row level security;
alter table public.company_users enable row level security;
alter table public.calls enable row level security;
alter table public.leads enable row level security;
alter table public.messages enable row level security;
alter table public.opt_outs enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_log enable row level security;
alter table public.rate_limits enable row level security;  -- no user policies: service-role only

create policy companies_select on public.companies
  for select using (id in (select public.user_company_ids()));
create policy companies_update on public.companies
  for update using (id in (select public.user_company_ids()));

create policy company_users_select on public.company_users
  for select using (user_id = auth.uid() or company_id in (select public.user_company_ids()));

create policy calls_select on public.calls
  for select using (company_id in (select public.user_company_ids()));

create policy leads_select on public.leads
  for select using (company_id in (select public.user_company_ids()));
create policy leads_update on public.leads
  for update using (company_id in (select public.user_company_ids()));

create policy messages_select on public.messages
  for select using (company_id in (select public.user_company_ids()));

create policy opt_outs_select on public.opt_outs
  for select using (company_id in (select public.user_company_ids()));

create policy notifications_select on public.notifications
  for select using (company_id in (select public.user_company_ids()));

create policy audit_select on public.audit_log
  for select using (company_id in (select public.user_company_ids()));
-- Dashboard writes to audit_log go through server actions using the user's
-- session; allow inserts scoped to the user's company.
create policy audit_insert on public.audit_log
  for insert with check (company_id in (select public.user_company_ids()));
