/** Conversation stages for the SMS qualification state machine. */
export type ConversationStage =
  | "initial_outreach" // recovery text sent, waiting for first reply
  | "awaiting_consent" // asked "are you needing service?" waiting for yes/no
  | "awaiting_name"
  | "awaiting_issue"
  | "awaiting_system_down"
  | "awaiting_urgency"
  | "awaiting_zip"
  | "awaiting_callback_time"
  | "completed"
  | "human_takeover"
  | "opted_out"
  | "emergency";

export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "appointment_booked"
  | "job_won"
  | "closed_lost"
  | "spam"
  | "opted_out";

export interface LeadAnswers {
  name?: string;
  issue?: string;
  system_down?: boolean;
  urgency?: string;
  zip?: string;
  callback_time?: string;
  notes?: string[];
}

export interface ConversationState {
  stage: ConversationStage;
  answers: LeadAnswers;
  /** Number of times the caller gave an answer we couldn't parse at the current stage. */
  unclearCount: number;
  /** Total inbound messages processed — hard cap to avoid endless questioning. */
  inboundCount: number;
}

export type StateMachineAction =
  | { type: "reply"; body: string }
  | { type: "notify_owner"; reason: "responded" | "qualified" | "emergency" | "needs_human" }
  | { type: "set_lead_status"; status: LeadStatus }
  | { type: "set_stage"; stage: ConversationStage };

export interface StateMachineResult {
  state: ConversationState;
  actions: StateMachineAction[];
}

export interface CompanyTemplates {
  company_name: string;
  initial_outreach: string;
  emergency_response: string;
  completed_response: string;
  opt_out_confirmation: string;
  help_response: string;
  human_takeover_note: string;
}

export const DEFAULT_TEMPLATES: Omit<CompanyTemplates, "company_name"> = {
  initial_outreach:
    "Hi, this is {{company_name}}. Sorry we missed your call. Are you needing HVAC service? Reply YES and we'll collect a few details so the team can follow up. Reply STOP to opt out.",
  emergency_response:
    "If you smell gas, hear a carbon monoxide alarm, or see smoke or fire: leave the building now and call 911 or your utility's emergency line from a safe location. Do not use phones or switches inside. Our team has been alerted and will follow up as soon as possible.",
  completed_response:
    "Thanks {{name}}! We've sent your details to the {{company_name}} team and someone will follow up. Note: this does not confirm an appointment or arrival time — the team will contact you to schedule.",
  opt_out_confirmation:
    "You have been unsubscribed from {{company_name}} messages. No further texts will be sent. Reply START to resubscribe.",
  help_response:
    "{{company_name}} missed-call follow-up. We text you after a missed call to collect service details. Reply STOP to opt out. For emergencies call 911.",
  human_takeover_note:
    "Thanks — a member of the {{company_name}} team will take it from here and text or call you directly.",
};
