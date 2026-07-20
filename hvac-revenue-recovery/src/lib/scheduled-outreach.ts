import { nextPermittedTime, isWithinQuietHours } from "./business-hours";

/**
 * How a company handles the recovery text when a missed call lands during
 * quiet hours. See migration 0002 for the column + defaults.
 */
export type QuietHoursMode = "immediate" | "schedule" | "notify_only";

export type OutreachDecision =
  | { kind: "send" }
  | { kind: "schedule"; at: Date }
  | { kind: "skip" };

/**
 * Pure decision: given the company's mode and whether we're currently in quiet
 * hours, decide whether to text the caller now, hold it for later, or never.
 * The lead is always created and staff always notified by the caller — this
 * only governs the automated text to the caller.
 */
export function decideOutreach(
  mode: QuietHoursMode,
  opts: {
    now: Date;
    timezone: string;
    quietStart: string;
    quietEnd: string;
  }
): OutreachDecision {
  // notify_only never auto-texts the caller, at any hour.
  if (mode === "notify_only") return { kind: "skip" };

  const quiet = isWithinQuietHours(opts.now, opts.timezone, opts.quietStart, opts.quietEnd);
  // immediate always sends; schedule sends only outside quiet hours.
  if (mode === "immediate" || !quiet) return { kind: "send" };

  return { kind: "schedule", at: nextPermittedTime(opts.now, opts.timezone, opts.quietStart, opts.quietEnd) };
}

export interface ClaimedOutreach {
  leadId: string;
  companyId: string;
  callerPhone: string;
}

export interface ReleaseDeps {
  /**
   * Atomically claim all leads whose scheduled outreach is due and not yet
   * sent, marking them sent in the same operation so no second run can claim
   * them. Returns the claimed rows. THIS is what guarantees no double-send.
   */
  claimDue: (now: Date) => Promise<ClaimedOutreach[]>;
  /** Send the recovery text for one claimed lead (records the message row). */
  sendOutreach: (lead: ClaimedOutreach) => Promise<void>;
}

/**
 * Release all due, scheduled recovery texts. Idempotent across concurrent or
 * repeated runs because `claimDue` atomically marks rows sent before returning
 * them — a second invocation sees an empty set.
 */
export async function releaseDueOutreach(
  deps: ReleaseDeps,
  now: Date = new Date()
): Promise<{ released: number; errors: number }> {
  const due = await deps.claimDue(now);
  let errors = 0;
  for (const lead of due) {
    try {
      await deps.sendOutreach(lead);
    } catch {
      errors += 1;
    }
  }
  return { released: due.length, errors };
}
