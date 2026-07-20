import { describe, it, expect } from "vitest";
import {
  decideOutreach,
  releaseDueOutreach,
  ClaimedOutreach,
} from "@/lib/scheduled-outreach";
import { nextPermittedTime, isWithinQuietHours } from "@/lib/business-hours";

const TZ = "America/Chicago";
// 03:00 UTC = 22:00 CDT the previous evening → inside 21:00–08:00 quiet hours
const quietNight = new Date("2026-07-21T03:00:00Z");
// 15:00 UTC = 10:00 CDT → outside quiet hours
const daytime = new Date("2026-07-20T15:00:00Z");
const opts = { timezone: TZ, quietStart: "21:00", quietEnd: "08:00" };

describe("decideOutreach — three modes", () => {
  it("immediate: always sends, even during quiet hours", () => {
    expect(decideOutreach("immediate", { now: quietNight, ...opts })).toEqual({ kind: "send" });
    expect(decideOutreach("immediate", { now: daytime, ...opts })).toEqual({ kind: "send" });
  });

  it("schedule: sends during permitted hours", () => {
    expect(decideOutreach("schedule", { now: daytime, ...opts })).toEqual({ kind: "send" });
  });

  it("schedule: defers to the next permitted time during quiet hours", () => {
    const d = decideOutreach("schedule", { now: quietNight, ...opts });
    expect(d.kind).toBe("schedule");
    if (d.kind === "schedule") {
      // Must be in the future and no longer within quiet hours
      expect(d.at.getTime()).toBeGreaterThan(quietNight.getTime());
      expect(isWithinQuietHours(d.at, TZ)).toBe(false);
    }
  });

  it("notify_only: never texts the caller, day or night", () => {
    expect(decideOutreach("notify_only", { now: quietNight, ...opts })).toEqual({ kind: "skip" });
    expect(decideOutreach("notify_only", { now: daytime, ...opts })).toEqual({ kind: "skip" });
  });
});

describe("nextPermittedTime", () => {
  it("returns the next local quiet-hours end", () => {
    const at = nextPermittedTime(quietNight, TZ);
    // 22:00 CDT → next 08:00 CDT is 10 hours later
    expect(at.getTime() - quietNight.getTime()).toBe(10 * 60 * 60 * 1000);
    expect(isWithinQuietHours(at, TZ)).toBe(false);
  });

  it("returns the input unchanged when not in quiet hours", () => {
    expect(nextPermittedTime(daytime, TZ).getTime()).toBe(daytime.getTime());
  });

  it("handles the pre-8am portion of the window", () => {
    const early = new Date("2026-07-20T11:30:00Z"); // 06:30 CDT
    const at = nextPermittedTime(early, TZ);
    // 06:30 → 08:00 same day = 90 minutes
    expect(at.getTime() - early.getTime()).toBe(90 * 60 * 1000);
  });
});

/**
 * In-memory stand-in for the Supabase-backed claim: models the atomic
 * "mark sent + return only newly-claimed rows" contract that guarantees a
 * scheduled lead can be released at most once.
 */
function makeFakeStore(rows: Array<{ leadId: string; companyId: string; callerPhone: string; due: boolean; sent?: boolean }>) {
  const sends: ClaimedOutreach[] = [];
  return {
    sends,
    claimDue: async (): Promise<ClaimedOutreach[]> => {
      const claimed = rows.filter((r) => r.due && !r.sent);
      // atomic: mark them sent before returning (mirrors the SQL UPDATE...RETURNING)
      claimed.forEach((r) => (r.sent = true));
      return claimed.map((r) => ({ leadId: r.leadId, companyId: r.companyId, callerPhone: r.callerPhone }));
    },
    sendOutreach: async (lead: ClaimedOutreach) => {
      sends.push(lead);
    },
  };
}

describe("releaseDueOutreach — no double send", () => {
  it("sends each due lead exactly once, even across repeated runs", async () => {
    const store = makeFakeStore([
      { leadId: "a", companyId: "c1", callerPhone: "+12145550111", due: true },
      { leadId: "b", companyId: "c1", callerPhone: "+12145550112", due: true },
      { leadId: "c", companyId: "c1", callerPhone: "+12145550113", due: false }, // not yet due
    ]);

    const first = await releaseDueOutreach(store);
    expect(first.released).toBe(2);

    // A second run (overlapping cron / retry) must not resend anything.
    const second = await releaseDueOutreach(store);
    expect(second.released).toBe(0);

    expect(store.sends.map((s) => s.leadId).sort()).toEqual(["a", "b"]);
    // The not-yet-due lead was never sent.
    expect(store.sends.some((s) => s.leadId === "c")).toBe(false);
  });

  it("counts send failures without blocking other leads", async () => {
    const store = makeFakeStore([
      { leadId: "a", companyId: "c1", callerPhone: "+12145550111", due: true },
      { leadId: "b", companyId: "c1", callerPhone: "+12145550112", due: true },
    ]);
    let calls = 0;
    const flaky = {
      claimDue: store.claimDue,
      sendOutreach: async (lead: ClaimedOutreach) => {
        calls += 1;
        if (lead.leadId === "a") throw new Error("twilio down");
      },
    };
    const res = await releaseDueOutreach(flaky);
    expect(res.released).toBe(2);
    expect(res.errors).toBe(1);
    expect(calls).toBe(2); // both attempted; one failed
  });
});
