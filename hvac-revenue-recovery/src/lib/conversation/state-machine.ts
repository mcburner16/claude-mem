import {
  ConversationState,
  StateMachineAction,
  StateMachineResult,
  CompanyTemplates,
} from "./types";
import {
  isStopKeyword,
  isStartKeyword,
  isHelpKeyword,
  isRestartKeyword,
  isHumanRequest,
  parseYesNo,
  parseName,
  parseIssue,
  parseUrgency,
  parseZip,
  parseCallbackTime,
} from "./parsers";
import { detectEmergency } from "./emergency";
import { renderTemplate } from "../templates";

/**
 * Pure conversation state machine. Given the current state, an inbound message,
 * and the company's templates, returns the next state plus a list of actions
 * (replies to send, notifications to fire, lead-status changes). No I/O here —
 * the SMS webhook handler executes the actions. That keeps this fully unit-testable.
 *
 * Guardrails:
 * - Never promises appointments, arrival times, prices, coverage, or emergency availability.
 * - Emergency keywords short-circuit everything except STOP.
 * - After MAX_UNCLEAR failed parses at one stage, or MAX_INBOUND total messages,
 *   the conversation escalates to a human instead of looping.
 */

export const MAX_UNCLEAR = 2;
export const MAX_INBOUND = 25;

const QUESTIONS = {
  name: "Great — can I get your first and last name?",
  issue: "Thanks {{name}}. What's going on with your system? (e.g. \"AC running but not cooling\", \"furnace won't turn on\")",
  system_down: "Got it. Is the system completely down right now? (YES/NO)",
  urgency: "How soon do you need someone out — today, this week, or flexible?",
  zip: "What's the ZIP code where the service is needed?",
  callback_time: "Last question — when is the best time for the team to call you back?",
};

function q(template: string, vars: Record<string, string | undefined>): string {
  return renderTemplate(template, vars);
}

export function handleInboundMessage(
  state: ConversationState,
  body: string,
  templates: CompanyTemplates
): StateMachineResult {
  const vars = {
    company_name: templates.company_name,
    name: state.answers.name?.split(" ")[0] ?? "",
  };
  const next: ConversationState = {
    ...state,
    answers: { ...state.answers, notes: [...(state.answers.notes ?? [])] },
    inboundCount: state.inboundCount + 1,
  };
  const actions: StateMachineAction[] = [];
  const reply = (b: string) => actions.push({ type: "reply", body: b });
  const setStage = (s: ConversationState["stage"]) => {
    next.stage = s;
    next.unclearCount = 0;
    actions.push({ type: "set_stage", stage: s });
  };

  // ---- Global keyword handling (highest priority) ----

  if (isStopKeyword(body)) {
    setStage("opted_out");
    actions.push({ type: "set_lead_status", status: "opted_out" });
    // Twilio auto-sends its own STOP confirmation for standard keywords; we
    // record the opt-out but do not send an extra message (carrier requirement).
    return { state: next, actions };
  }

  if (next.stage === "opted_out") {
    if (isStartKeyword(body)) {
      setStage("awaiting_consent");
      actions.push({ type: "set_lead_status", status: "contacted" });
      reply(q(templates.initial_outreach, vars));
    }
    // Any other message from an opted-out number: stay silent.
    return { state: next, actions };
  }

  if (isHelpKeyword(body)) {
    reply(q(templates.help_response, vars));
    return { state: next, actions };
  }

  // Emergency detection beats everything else, including human takeover.
  if (next.stage !== "emergency" && detectEmergency(body)) {
    setStage("emergency");
    next.answers.notes!.push(`EMERGENCY LANGUAGE DETECTED: "${body.trim()}"`);
    reply(q(templates.emergency_response, vars));
    actions.push({ type: "notify_owner", reason: "emergency" });
    return { state: next, actions };
  }

  // Once in human-takeover or emergency, automation stays quiet.
  if (next.stage === "human_takeover" || next.stage === "emergency") {
    next.answers.notes!.push(`Caller (during ${next.stage}): "${body.trim()}"`);
    return { state: next, actions };
  }

  if (isRestartKeyword(body)) {
    next.answers = { notes: next.answers.notes };
    setStage("awaiting_consent");
    reply(q(templates.initial_outreach, vars));
    return { state: next, actions };
  }

  if (isHumanRequest(body)) {
    setStage("human_takeover");
    reply(q(templates.human_takeover_note, vars));
    actions.push({ type: "notify_owner", reason: "needs_human" });
    return { state: next, actions };
  }

  // Hard cap on total exchanges — never interrogate someone forever.
  if (next.inboundCount > MAX_INBOUND) {
    setStage("human_takeover");
    reply(q(templates.human_takeover_note, vars));
    actions.push({ type: "notify_owner", reason: "needs_human" });
    return { state: next, actions };
  }

  const escalateUnclear = () => {
    setStage("human_takeover");
    reply(q(templates.human_takeover_note, vars));
    actions.push({ type: "notify_owner", reason: "needs_human" });
  };

  // ---- Stage-specific handling ----

  switch (next.stage) {
    case "initial_outreach":
    case "awaiting_consent": {
      // First reply of the conversation → owner gets a heads-up.
      if (next.stage === "initial_outreach") {
        actions.push({ type: "notify_owner", reason: "responded" });
        actions.push({ type: "set_lead_status", status: "contacted" });
      }
      const yn = parseYesNo(body);
      if (yn === "yes") {
        setStage("awaiting_name");
        reply(QUESTIONS.name);
      } else if (yn === "no") {
        setStage("completed");
        actions.push({ type: "set_lead_status", status: "closed_lost" });
        reply(
          q(
            "No problem — if you need {{company_name}} in the future, just call or text this number. Reply STOP to opt out.",
            vars
          )
        );
      } else {
        // Treat a descriptive first message ("my ac is broken") as consent + issue.
        const issue = parseIssue(body);
        if (issue && issue.length >= 8 && !/^(who|why|what|how)\b/i.test(issue)) {
          next.answers.issue = issue;
          setStage("awaiting_name");
          reply("Sorry to hear that — we can help get details to the team. " + QUESTIONS.name);
        } else {
          next.unclearCount += 1;
          if (next.unclearCount > MAX_UNCLEAR) return escalateUnclear(), { state: next, actions };
          reply(
            q(
              "Just to confirm — are you needing HVAC service from {{company_name}}? Reply YES or NO.",
              vars
            )
          );
        }
      }
      break;
    }

    case "awaiting_name": {
      const name = parseName(body);
      if (name) {
        next.answers.name = name;
        vars.name = name.split(" ")[0];
        if (next.answers.issue) {
          setStage("awaiting_system_down");
          reply(q(QUESTIONS.system_down, vars));
        } else {
          setStage("awaiting_issue");
          reply(q(QUESTIONS.issue, vars));
        }
      } else {
        next.unclearCount += 1;
        if (next.unclearCount > MAX_UNCLEAR) return escalateUnclear(), { state: next, actions };
        reply("Sorry, I didn't catch that. What name should the team ask for?");
      }
      break;
    }

    case "awaiting_issue": {
      const issue = parseIssue(body);
      if (issue) {
        next.answers.issue = issue;
        setStage("awaiting_system_down");
        reply(QUESTIONS.system_down);
      } else {
        next.unclearCount += 1;
        if (next.unclearCount > MAX_UNCLEAR) return escalateUnclear(), { state: next, actions };
        reply("Could you describe the issue in a few words? (e.g. \"AC not cooling\")");
      }
      break;
    }

    case "awaiting_system_down": {
      const yn = parseYesNo(body);
      if (yn !== "unclear") {
        next.answers.system_down = yn === "yes";
        setStage("awaiting_urgency");
        reply(QUESTIONS.urgency);
      } else {
        next.unclearCount += 1;
        if (next.unclearCount > MAX_UNCLEAR) return escalateUnclear(), { state: next, actions };
        reply("Is the system completely down right now? Please reply YES or NO.");
      }
      break;
    }

    case "awaiting_urgency": {
      const u = parseUrgency(body);
      if (u) {
        next.answers.urgency = u.raw;
        setStage("awaiting_zip");
        reply(QUESTIONS.zip);
      } else {
        next.unclearCount += 1;
        if (next.unclearCount > MAX_UNCLEAR) return escalateUnclear(), { state: next, actions };
        reply("How soon do you need service — today, this week, or flexible?");
      }
      break;
    }

    case "awaiting_zip": {
      const zip = parseZip(body);
      if (zip) {
        next.answers.zip = zip;
        setStage("awaiting_callback_time");
        reply(QUESTIONS.callback_time);
      } else {
        next.unclearCount += 1;
        if (next.unclearCount > MAX_UNCLEAR) return escalateUnclear(), { state: next, actions };
        reply("What's the 5-digit ZIP code for the service address?");
      }
      break;
    }

    case "awaiting_callback_time": {
      const cb = parseCallbackTime(body);
      if (cb) {
        next.answers.callback_time = cb;
        setStage("completed");
        actions.push({ type: "set_lead_status", status: "qualified" });
        reply(q(templates.completed_response, vars));
        actions.push({ type: "notify_owner", reason: "qualified" });
      } else {
        next.unclearCount += 1;
        if (next.unclearCount > MAX_UNCLEAR) return escalateUnclear(), { state: next, actions };
        reply("When's the best time for a callback? (e.g. \"ASAP\", \"after 3pm\", \"tomorrow morning\")");
      }
      break;
    }

    case "completed": {
      // Post-completion messages get stored as notes; one gentle acknowledgment.
      next.answers.notes!.push(`Caller (after completion): "${body.trim()}"`);
      reply(
        q("Thanks — we've added that note for the {{company_name}} team.", vars)
      );
      break;
    }
  }

  return { state: next, actions };
}

export function initialConversationState(): ConversationState {
  return { stage: "initial_outreach", answers: { notes: [] }, unclearCount: 0, inboundCount: 0 };
}
