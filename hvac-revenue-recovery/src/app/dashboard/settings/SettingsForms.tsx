"use client";

import { useState, useTransition } from "react";
import { updateSettings, markEmergencyReviewed } from "../actions";
import { DEFAULT_TEMPLATES } from "@/lib/conversation/types";
import { DEFAULT_BUSINESS_HOURS } from "@/lib/business-hours";

interface Company {
  name: string;
  timezone: string;
  twilio_number: string | null;
  forward_to_number: string | null;
  dial_timeout_seconds: number;
  after_hours_forwarding: boolean;
  business_hours: Record<string, unknown>;
  quiet_hours_start: string;
  quiet_hours_end: string;
  templates: Record<string, string>;
  emergency_response_reviewed: boolean;
  notify_sms_numbers: string[];
  notify_emails: string[];
  notify_on: Record<string, boolean>;
  consent_wording: string | null;
  data_retention_days: number;
  avg_job_value_cents: number;
  a2p_registration: Record<string, unknown>;
  is_demo: boolean;
}

function Section({
  title,
  description,
  children,
  onSubmit,
  pending,
  message,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  onSubmit: (form: HTMLFormElement) => void;
  pending: boolean;
  message: string | null;
}) {
  return (
    <section className="bg-white rounded-xl border border-slate-200 p-4">
      <h2 className="font-semibold">{title}</h2>
      {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
      <form
        className="mt-3 space-y-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(e.currentTarget);
        }}
      >
        {children}
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

const inputCls = "w-full rounded-lg border border-slate-300 px-3 py-2";
const labelCls = "block text-slate-500 mb-1";

export function SettingsForms({ company }: { company: Company }) {
  const [pending, startTransition] = useTransition();
  const [messages, setMessages] = useState<Record<string, string | null>>({});

  function submit(section: string) {
    return (form: HTMLFormElement) => {
      const fd = new FormData(form);
      startTransition(async () => {
        const res = await updateSettings(fd);
        setMessages((m) => ({ ...m, [section]: res.error ? `Error: ${res.error}` : "Saved." }));
        if (!res.error) setTimeout(() => setMessages((m) => ({ ...m, [section]: null })), 2500);
      });
    };
  }

  const t = (key: keyof typeof DEFAULT_TEMPLATES) => company.templates?.[key] ?? DEFAULT_TEMPLATES[key];
  const hoursJson = JSON.stringify(
    Object.keys(company.business_hours ?? {}).length ? company.business_hours : DEFAULT_BUSINESS_HOURS,
    null,
    2
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-xl font-bold">Settings</h1>

      <Section
        title="Company profile"
        description="Used in text messages, notifications, and reports."
        onSubmit={submit("profile")}
        pending={pending}
        message={messages.profile ?? null}
      >
        <div>
          <label className={labelCls} htmlFor="name">Company name</label>
          <input id="name" name="name" defaultValue={company.name} className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls} htmlFor="timezone">Timezone (IANA)</label>
            <input id="timezone" name="timezone" defaultValue={company.timezone} className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="avg_job_value_dollars">Average job value ($, for estimates only)</label>
            <input
              id="avg_job_value_dollars"
              name="avg_job_value_dollars"
              type="number"
              min="0"
              defaultValue={(company.avg_job_value_cents / 100).toFixed(0)}
              className={inputCls}
            />
          </div>
        </div>
      </Section>

      <Section
        title="Phone & call routing"
        description={`Your tracking number is ${company.twilio_number ?? "not yet assigned"}. Calls to it forward to the number below. The dial timeout must be shorter than your voicemail pickup time, or missed calls will look answered.`}
        onSubmit={submit("phone")}
        pending={pending}
        message={messages.phone ?? null}
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls} htmlFor="forward_to_number">Forward calls to (E.164)</label>
            <input
              id="forward_to_number"
              name="forward_to_number"
              defaultValue={company.forward_to_number ?? ""}
              placeholder="+12145551234"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="dial_timeout_seconds">Dial timeout (seconds, 5–55)</label>
            <input
              id="dial_timeout_seconds"
              name="dial_timeout_seconds"
              type="number"
              min={5}
              max={55}
              defaultValue={company.dial_timeout_seconds}
              className={inputCls}
            />
          </div>
        </div>
        <div>
          <label className={labelCls} htmlFor="after_hours_forwarding">After-hours behavior</label>
          <select
            id="after_hours_forwarding"
            name="after_hours_forwarding"
            defaultValue={String(company.after_hours_forwarding)}
            className={inputCls}
          >
            <option value="true">Still ring our phone after hours (text caller only if unanswered)</option>
            <option value="false">Don&apos;t ring after hours — go straight to the recovery text</option>
          </select>
        </div>
      </Section>

      <Section
        title="Business hours"
        description='Days 0 (Sunday) through 6 (Saturday), 24h times. Mark a day {"closed": true} to skip it.'
        onSubmit={submit("hours")}
        pending={pending}
        message={messages.hours ?? null}
      >
        <div>
          <label className={labelCls} htmlFor="business_hours_json">Hours (JSON)</label>
          <textarea
            id="business_hours_json"
            name="business_hours_json"
            rows={10}
            defaultValue={hoursJson}
            className={`${inputCls} font-mono text-xs`}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls} htmlFor="quiet_hours_start">Quiet hours start (no first texts after)</label>
            <input
              id="quiet_hours_start"
              name="quiet_hours_start"
              defaultValue={company.quiet_hours_start}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="quiet_hours_end">Quiet hours end</label>
            <input
              id="quiet_hours_end"
              name="quiet_hours_end"
              defaultValue={company.quiet_hours_end}
              className={inputCls}
            />
          </div>
        </div>
      </Section>

      <Section
        title="Notifications"
        description="Who gets alerted when a lead responds, qualifies, or needs help. Emergency alerts always send."
        onSubmit={submit("notify")}
        pending={pending}
        message={messages.notify ?? null}
      >
        <input type="hidden" name="notify_section" value="1" />
        <div>
          <label className={labelCls} htmlFor="notify_sms_numbers">SMS numbers (comma-separated, E.164)</label>
          <input
            id="notify_sms_numbers"
            name="notify_sms_numbers"
            defaultValue={(company.notify_sms_numbers ?? []).join(", ")}
            placeholder="+12145551234, +12145555678"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="notify_emails">Email addresses (comma-separated)</label>
          <input
            id="notify_emails"
            name="notify_emails"
            defaultValue={(company.notify_emails ?? []).join(", ")}
            placeholder="owner@company.com"
            className={inputCls}
          />
        </div>
        <fieldset className="space-y-1">
          <legend className="text-slate-500 mb-1">Notify me when…</legend>
          {(
            [
              ["notify_on_responded", "responded", "A caller responds to the recovery text"],
              ["notify_on_qualified", "qualified", "A lead completes qualification"],
              ["notify_on_needs_human", "needs_human", "A conversation needs human help"],
            ] as const
          ).map(([name, key, label]) => (
            <label key={name} className="flex items-center gap-2">
              <input
                type="checkbox"
                name={name}
                defaultChecked={company.notify_on?.[key] !== false}
              />
              {label}
            </label>
          ))}
          <p className="text-xs text-slate-400">Emergency language detection always notifies.</p>
        </fieldset>
      </Section>

      <Section
        title="Message templates"
        description="Available variables: {{company_name}}, {{name}}. Keep messages under 320 characters where possible (2 SMS segments)."
        onSubmit={submit("templates")}
        pending={pending}
        message={messages.templates ?? null}
      >
        {(
          [
            ["initial_outreach", "Initial recovery text"],
            ["completed_response", "Qualification-complete reply"],
            ["help_response", "HELP keyword reply"],
            ["human_takeover_note", "Human-takeover reply"],
          ] as const
        ).map(([key, label]) => (
          <div key={key}>
            <label className={labelCls} htmlFor={key}>{label}</label>
            <textarea id={key} name={key} rows={3} defaultValue={t(key)} className={inputCls} />
          </div>
        ))}
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
          <label className={`${labelCls} font-semibold text-amber-900`} htmlFor="emergency_response">
            Emergency safety response{" "}
            {company.emergency_response_reviewed ? (
              <span className="text-green-700">(reviewed ✓)</span>
            ) : (
              <span className="text-red-600">(NEEDS COMPANY REVIEW)</span>
            )}
          </label>
          <p className="text-xs text-amber-800 mb-2">
            Sent when a caller mentions gas smell, CO alarms, smoke, or fire. Your company must
            review this wording — saving any change resets the reviewed flag.
          </p>
          <textarea
            id="emergency_response"
            name="emergency_response"
            rows={4}
            defaultValue={t("emergency_response")}
            className={inputCls}
          />
          {!company.emergency_response_reviewed && (
            <button
              type="button"
              className="mt-2 text-xs text-brand-600 underline"
              onClick={() => startTransition(async () => { await markEmergencyReviewed(); })}
            >
              Mark current wording as reviewed by the company
            </button>
          )}
        </div>
      </Section>

      <Section
        title="Compliance"
        description="Consent wording, data retention, and A2P 10DLC registration details. See the compliance checklist in the docs — this software does not make you automatically compliant."
        onSubmit={submit("compliance")}
        pending={pending}
        message={messages.compliance ?? null}
      >
        <div>
          <label className={labelCls} htmlFor="consent_wording">Consent / identification wording (appended context for review)</label>
          <textarea
            id="consent_wording"
            name="consent_wording"
            rows={3}
            defaultValue={company.consent_wording ?? ""}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="data_retention_days">Data retention (days, 30–3650)</label>
          <input
            id="data_retention_days"
            name="data_retention_days"
            type="number"
            min={30}
            max={3650}
            defaultValue={company.data_retention_days}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="a2p_json">A2P 10DLC registration info (JSON: brand SID, campaign SID, status, notes)</label>
          <textarea
            id="a2p_json"
            name="a2p_json"
            rows={4}
            defaultValue={JSON.stringify(company.a2p_registration ?? {}, null, 2)}
            className={`${inputCls} font-mono text-xs`}
          />
        </div>
      </Section>
    </div>
  );
}
