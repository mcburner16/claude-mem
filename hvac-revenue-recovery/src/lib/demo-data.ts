/**
 * Seeded demo leads used for sales demos. Reset restores exactly this data.
 * All names/numbers are fictional; 555-01xx numbers are reserved for fiction.
 */

export const DEMO_COMPANY_SLUG = "demo-hvac";

export const DEMO_COMPANY = {
  name: "Lone Star Air Solutions (DEMO)",
  slug: DEMO_COMPANY_SLUG,
  is_demo: true,
  timezone: "America/Chicago",
  twilio_number: "+12145550100",
  forward_to_number: "+12145550199",
  notify_sms_numbers: ["+12145550199"],
  notify_emails: ["owner@demo.example.com"],
  brand: { city: "Dallas, TX", website: "lonestarair.example.com" },
};

interface DemoLead {
  caller_phone: string;
  status: string;
  conversation_stage: string;
  is_emergency?: boolean;
  answers: Record<string, unknown>;
  appointment_at_offset_hours?: number;
  job_value_cents?: number;
  job_value_is_estimate?: boolean;
  internal_notes?: string;
  created_hours_ago: number;
  messages: Array<{ direction: "inbound" | "outbound"; body: string; kind?: string }>;
}

const OUTREACH =
  "Hi, this is Lone Star Air Solutions (DEMO). Sorry we missed your call. Are you needing HVAC service? Reply YES and we'll collect a few details so the team can follow up. Reply STOP to opt out.";

export const DEMO_LEADS: DemoLead[] = [
  {
    // 1. AC not cooling — fully qualified, appointment booked
    caller_phone: "+12145550192",
    status: "appointment_booked",
    conversation_stage: "completed",
    created_hours_ago: 26,
    appointment_at_offset_hours: 20,
    job_value_cents: 38900,
    job_value_is_estimate: true,
    internal_notes: "Booked for tomorrow 10am. Likely capacitor or refrigerant.",
    answers: {
      name: "Sarah Jones",
      issue: "AC is running but not cooling",
      system_down: true,
      urgency: "Today if possible",
      zip: "75201",
      callback_time: "As soon as possible",
      notes: [],
    },
    messages: [
      { direction: "outbound", body: OUTREACH, kind: "initial_outreach" },
      { direction: "inbound", body: "YES" },
      { direction: "outbound", body: "Great — can I get your first and last name?" },
      { direction: "inbound", body: "Sarah Jones" },
      { direction: "outbound", body: "Thanks Sarah. What's going on with your system?" },
      { direction: "inbound", body: "AC is running but not cooling" },
      { direction: "outbound", body: "Got it. Is the system completely down right now? (YES/NO)" },
      { direction: "inbound", body: "yes it's blowing warm air" },
      { direction: "outbound", body: "How soon do you need someone out — today, this week, or flexible?" },
      { direction: "inbound", body: "Today if possible" },
      { direction: "outbound", body: "What's the ZIP code where the service is needed?" },
      { direction: "inbound", body: "75201" },
      { direction: "outbound", body: "Last question — when is the best time for the team to call you back?" },
      { direction: "inbound", body: "As soon as possible" },
      {
        direction: "outbound",
        body: "Thanks Sarah! We've sent your details to the Lone Star Air Solutions (DEMO) team and someone will follow up. Note: this does not confirm an appointment or arrival time — the team will contact you to schedule.",
      },
    ],
  },
  {
    // 2. Complete system failure — qualified, job won
    caller_phone: "+12145550137",
    status: "job_won",
    conversation_stage: "completed",
    created_hours_ago: 96,
    job_value_cents: 720000,
    job_value_is_estimate: false,
    internal_notes: "Full system replacement. Invoice #1042 paid.",
    answers: {
      name: "Miguel Herrera",
      issue: "Whole system dead, no power to thermostat",
      system_down: true,
      urgency: "ASAP - house is 92 degrees",
      zip: "75218",
      callback_time: "Anytime today",
      notes: [],
    },
    messages: [
      { direction: "outbound", body: OUTREACH, kind: "initial_outreach" },
      { direction: "inbound", body: "Yes please, whole system is dead, no power to thermostat" },
      { direction: "outbound", body: "Sorry to hear that — we can help get details to the team. Great — can I get your first and last name?" },
      { direction: "inbound", body: "Miguel Herrera" },
      { direction: "outbound", body: "Got it. Is the system completely down right now? (YES/NO)" },
      { direction: "inbound", body: "YES" },
      { direction: "outbound", body: "How soon do you need someone out — today, this week, or flexible?" },
      { direction: "inbound", body: "ASAP - house is 92 degrees" },
      { direction: "outbound", body: "What's the ZIP code where the service is needed?" },
      { direction: "inbound", body: "75218" },
      { direction: "outbound", body: "Last question — when is the best time for the team to call you back?" },
      { direction: "inbound", body: "Anytime today" },
      { direction: "outbound", body: "Thanks Miguel! We've sent your details to the team and someone will follow up." },
    ],
  },
  {
    // 3. Heating issue — qualified, awaiting contact
    caller_phone: "+12145550164",
    status: "qualified",
    conversation_stage: "completed",
    created_hours_ago: 5,
    answers: {
      name: "Denise Walker",
      issue: "Furnace makes a loud bang when it kicks on",
      system_down: false,
      urgency: "This week",
      zip: "75081",
      callback_time: "After 5pm weekdays",
      notes: [],
    },
    messages: [
      { direction: "outbound", body: OUTREACH, kind: "initial_outreach" },
      { direction: "inbound", body: "yes" },
      { direction: "outbound", body: "Great — can I get your first and last name?" },
      { direction: "inbound", body: "Denise Walker" },
      { direction: "outbound", body: "Thanks Denise. What's going on with your system?" },
      { direction: "inbound", body: "Furnace makes a loud bang when it kicks on" },
      { direction: "outbound", body: "Got it. Is the system completely down right now? (YES/NO)" },
      { direction: "inbound", body: "no it still runs" },
      { direction: "outbound", body: "How soon do you need someone out — today, this week, or flexible?" },
      { direction: "inbound", body: "this week" },
      { direction: "outbound", body: "What's the ZIP code where the service is needed?" },
      { direction: "inbound", body: "75081" },
      { direction: "outbound", body: "Last question — when is the best time for the team to call you back?" },
      { direction: "inbound", body: "after 5pm weekdays" },
      { direction: "outbound", body: "Thanks Denise! We've sent your details to the team and someone will follow up." },
    ],
  },
  {
    // 4. Maintenance request — contacted, mid-conversation
    caller_phone: "+12145550171",
    status: "contacted",
    conversation_stage: "awaiting_zip",
    created_hours_ago: 1,
    answers: {
      name: "Robert Kim",
      issue: "Just want a seasonal tune-up before summer",
      system_down: false,
      urgency: "Flexible, whenever you have availability",
      notes: [],
    },
    messages: [
      { direction: "outbound", body: OUTREACH, kind: "initial_outreach" },
      { direction: "inbound", body: "Yes - just want a seasonal tune-up before summer" },
      { direction: "outbound", body: "Sorry to hear that — we can help get details to the team. Great — can I get your first and last name?" },
      { direction: "inbound", body: "Robert Kim" },
      { direction: "outbound", body: "Got it. Is the system completely down right now? (YES/NO)" },
      { direction: "inbound", body: "No" },
      { direction: "outbound", body: "How soon do you need someone out — today, this week, or flexible?" },
      { direction: "inbound", body: "Flexible, whenever you have availability" },
      { direction: "outbound", body: "What's the ZIP code where the service is needed?" },
    ],
  },
  {
    // 5. After-hours call — new, outreach sent, no reply yet
    caller_phone: "+12145550183",
    status: "new",
    conversation_stage: "initial_outreach",
    created_hours_ago: 10,
    answers: { notes: ["Call received after hours (9:47 PM)."] },
    messages: [{ direction: "outbound", body: OUTREACH, kind: "initial_outreach" }],
  },
  {
    // 6. Spam caller
    caller_phone: "+18005550142",
    status: "spam",
    conversation_stage: "completed",
    created_hours_ago: 50,
    internal_notes: "Robocall / warranty spam. Marked spam.",
    answers: { notes: ['Caller replied with marketing spam: "Lower your business insurance rates today..."'] },
    messages: [
      { direction: "outbound", body: OUTREACH, kind: "initial_outreach" },
      { direction: "inbound", body: "Lower your business insurance rates today! Click http://spam.example" },
    ],
  },
  {
    // 7. Emergency gas smell
    caller_phone: "+12145550155",
    status: "contacted",
    conversation_stage: "emergency",
    is_emergency: true,
    created_hours_ago: 3,
    internal_notes: "EMERGENCY - called back immediately, advised Atmos Energy dispatch. Follow up tomorrow.",
    answers: {
      notes: ['EMERGENCY LANGUAGE DETECTED: "I smell gas near the furnace closet"'],
    },
    messages: [
      { direction: "outbound", body: OUTREACH, kind: "initial_outreach" },
      { direction: "inbound", body: "I smell gas near the furnace closet" },
      {
        direction: "outbound",
        kind: "emergency",
        body: "If you smell gas, hear a carbon monoxide alarm, or see smoke or fire: leave the building now and call 911 or your utility's emergency line from a safe location. Do not use phones or switches inside. Our team has been alerted and will follow up as soon as possible.",
      },
    ],
  },
];

/** Rotating fake caller numbers for live "simulate a missed call" demos. */
export const DEMO_SIMULATION_CALLERS = [
  "+14695550111",
  "+14695550122",
  "+14695550133",
  "+14695550144",
  "+14695550155",
];
