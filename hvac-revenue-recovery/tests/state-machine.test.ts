import { describe, it, expect } from "vitest";
import {
  handleInboundMessage,
  initialConversationState,
  MAX_UNCLEAR,
} from "@/lib/conversation/state-machine";
import { ConversationState, CompanyTemplates, DEFAULT_TEMPLATES } from "@/lib/conversation/types";

const templates: CompanyTemplates = {
  company_name: "Test HVAC Co",
  ...DEFAULT_TEMPLATES,
};

function run(state: ConversationState, body: string) {
  return handleInboundMessage(state, body, templates);
}

function replies(actions: ReturnType<typeof run>["actions"]): string[] {
  return actions.filter((a) => a.type === "reply").map((a) => (a as { body: string }).body);
}

describe("conversation state machine", () => {
  it("completes the full happy path and qualifies the lead", () => {
    let state = initialConversationState();
    const script: Array<[string, string]> = [
      ["YES", "awaiting_name"],
      ["Sarah Jones", "awaiting_issue"],
      ["AC is running but not cooling", "awaiting_system_down"],
      ["yes", "awaiting_urgency"],
      ["today please", "awaiting_zip"],
      ["75201", "awaiting_callback_time"],
    ];
    for (const [msg, expectedStage] of script) {
      const r = run(state, msg);
      state = r.state;
      expect(state.stage).toBe(expectedStage);
      expect(replies(r.actions).length).toBeGreaterThan(0);
    }
    const final = run(state, "as soon as possible");
    expect(final.state.stage).toBe("completed");
    expect(final.state.answers).toMatchObject({
      name: "Sarah Jones",
      issue: "AC is running but not cooling",
      system_down: true,
      zip: "75201",
      callback_time: "as soon as possible",
    });
    expect(final.actions).toContainEqual({ type: "set_lead_status", status: "qualified" });
    expect(final.actions).toContainEqual({ type: "notify_owner", reason: "qualified" });
    // Safety: the completion message must never promise appointments/prices
    const finalReply = replies(final.actions).join(" ").toLowerCase();
    expect(finalReply).toContain("does not confirm an appointment");
  });

  it("treats a descriptive first reply as consent + issue", () => {
    const r = run(initialConversationState(), "my AC is blowing warm air");
    expect(r.state.stage).toBe("awaiting_name");
    expect(r.state.answers.issue).toBe("my AC is blowing warm air");
    expect(r.actions).toContainEqual({ type: "notify_owner", reason: "responded" });
    expect(r.actions).toContainEqual({ type: "set_lead_status", status: "contacted" });
  });

  it("closes politely when the caller says no", () => {
    const r = run(initialConversationState(), "no, wrong number");
    expect(r.state.stage).toBe("completed");
    expect(r.actions).toContainEqual({ type: "set_lead_status", status: "closed_lost" });
  });

  it("handles STOP at any stage and goes silent afterward", () => {
    let state = initialConversationState();
    state = run(state, "YES").state;
    const stop = run(state, "STOP");
    expect(stop.state.stage).toBe("opted_out");
    expect(stop.actions).toContainEqual({ type: "set_lead_status", status: "opted_out" });
    // No outbound reply (Twilio handles the standard STOP confirmation)
    expect(replies(stop.actions)).toHaveLength(0);
    // Subsequent messages produce no replies
    const after = run(stop.state, "hello?");
    expect(replies(after.actions)).toHaveLength(0);
    expect(after.state.stage).toBe("opted_out");
  });

  it("resubscribes on START after an opt-out", () => {
    let state = initialConversationState();
    state = run(state, "STOP").state;
    const r = run(state, "START");
    expect(r.state.stage).toBe("awaiting_consent");
    expect(replies(r.actions).length).toBe(1);
  });

  it("answers HELP without losing conversation state", () => {
    let state = initialConversationState();
    state = run(state, "YES").state;
    const r = run(state, "HELP");
    expect(r.state.stage).toBe("awaiting_name");
    expect(replies(r.actions)[0]).toContain("Test HVAC Co");
  });

  it("restarts the conversation on 'start over'", () => {
    let state = initialConversationState();
    state = run(state, "YES").state;
    state = run(state, "Bob Smith").state;
    const r = run(state, "start over");
    expect(r.state.stage).toBe("awaiting_consent");
    expect(r.state.answers.name).toBeUndefined();
  });

  it("escalates to a human when the caller asks for one", () => {
    let state = initialConversationState();
    state = run(state, "YES").state;
    const r = run(state, "can I just talk to a real person");
    expect(r.state.stage).toBe("human_takeover");
    expect(r.actions).toContainEqual({ type: "notify_owner", reason: "needs_human" });
    // Automation stays silent afterward
    const after = run(r.state, "hello?");
    expect(replies(after.actions)).toHaveLength(0);
  });

  it("escalates after repeated unclear answers instead of looping", () => {
    let state = initialConversationState();
    state = run(state, "YES").state; // awaiting_name
    for (let i = 0; i < MAX_UNCLEAR; i++) {
      const r = run(state, "🤷 12345 @@@");
      state = r.state;
      expect(state.stage).toBe("awaiting_name");
    }
    const final = run(state, "!!!! ????");
    expect(final.state.stage).toBe("human_takeover");
    expect(final.actions).toContainEqual({ type: "notify_owner", reason: "needs_human" });
  });

  it("interrupts any stage with the emergency response on gas smell", () => {
    let state = initialConversationState();
    state = run(state, "YES").state;
    state = run(state, "Jane Doe").state;
    const r = run(state, "actually I smell gas near the furnace");
    expect(r.state.stage).toBe("emergency");
    expect(r.actions).toContainEqual({ type: "notify_owner", reason: "emergency" });
    const text = replies(r.actions).join(" ");
    expect(text).toContain("911");
    // Automation goes quiet after the emergency response
    const after = run(r.state, "ok we are outside");
    expect(replies(after.actions)).toHaveLength(0);
  });

  it("still honors STOP while in emergency stage", () => {
    let state = initialConversationState();
    state = run(state, "I smell gas").state;
    expect(state.stage).toBe("emergency");
    const r = run(state, "STOP");
    expect(r.state.stage).toBe("opted_out");
  });

  it("records post-completion messages as notes with one acknowledgment", () => {
    let state = initialConversationState();
    for (const msg of ["YES", "Sarah Jones", "AC broken", "yes", "today", "75201", "asap"]) {
      state = run(state, msg).state;
    }
    expect(state.stage).toBe("completed");
    const r = run(state, "also the gate code is 4321");
    expect(r.state.stage).toBe("completed");
    expect(r.state.answers.notes!.some((n) => n.includes("gate code"))).toBe(true);
    expect(replies(r.actions)).toHaveLength(1);
  });

  it("skips the issue question when the issue came in the first message", () => {
    let state = initialConversationState();
    state = run(state, "yes my heater is making a grinding noise").state;
    const r = run(state, "Mike Chen");
    expect(r.state.stage).toBe("awaiting_system_down");
  });

  it("never promises appointments, prices, or arrival times in any scripted reply", () => {
    // Walk the whole flow and scan every outbound message for forbidden promises
    let state = initialConversationState();
    const all: string[] = [];
    for (const msg of ["YES", "Sarah Jones", "AC broken", "yes", "today", "75201", "asap"]) {
      const r = run(state, msg);
      state = r.state;
      all.push(...replies(r.actions));
    }
    const joined = all.join(" ").toLowerCase();
    for (const forbidden of [
      "we guarantee",
      "we will arrive",
      "will be there at",
      "price is",
      "costs $",
      "we service your area",
      "emergency service is available",
    ]) {
      expect(joined).not.toContain(forbidden);
    }
  });
});
