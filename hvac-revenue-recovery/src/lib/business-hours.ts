/**
 * Business hours + quiet hours evaluation.
 * Times are stored per-company as "HH:MM" strings with an IANA timezone.
 */

export interface DayHours {
  open: string; // "08:00"
  close: string; // "17:00"
  closed?: boolean;
}

/** keys: "0" (Sunday) .. "6" (Saturday) */
export type WeekHours = Record<string, DayHours>;

export const DEFAULT_BUSINESS_HOURS: WeekHours = {
  "0": { open: "00:00", close: "00:00", closed: true },
  "1": { open: "08:00", close: "17:00" },
  "2": { open: "08:00", close: "17:00" },
  "3": { open: "08:00", close: "17:00" },
  "4": { open: "08:00", close: "17:00" },
  "5": { open: "08:00", close: "17:00" },
  "6": { open: "00:00", close: "00:00", closed: true },
};

function minutesOfDay(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Get { weekday (0=Sun..6=Sat), minutes since midnight } for `date` in `timeZone`. */
export function localDayAndMinutes(date: Date, timeZone: string): { day: number; minutes: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const day = dayNames.indexOf(get("weekday"));
  const hour = Number(get("hour")) % 24; // Intl can return "24" for midnight
  const minutes = hour * 60 + Number(get("minute"));
  return { day, minutes };
}

export function isWithinBusinessHours(
  date: Date,
  hours: WeekHours,
  timeZone: string
): boolean {
  const { day, minutes } = localDayAndMinutes(date, timeZone);
  const dh = hours[String(day)];
  if (!dh || dh.closed) return false;
  return minutes >= minutesOfDay(dh.open) && minutes < minutesOfDay(dh.close);
}

/**
 * TCPA-style quiet hours: don't initiate texts between quietStart and quietEnd
 * local time (default 21:00–08:00). Replies to an active conversation are
 * still allowed — this gate applies to the *initial* outreach text.
 */
export function isWithinQuietHours(
  date: Date,
  timeZone: string,
  quietStart = "21:00",
  quietEnd = "08:00"
): boolean {
  const { minutes } = localDayAndMinutes(date, timeZone);
  const start = minutesOfDay(quietStart);
  const end = minutesOfDay(quietEnd);
  if (start === end) return false;
  if (start < end) return minutes >= start && minutes < end;
  // window crosses midnight
  return minutes >= start || minutes < end;
}

/**
 * Given a moment inside quiet hours, return the next moment outside them —
 * i.e. the next local `quietEnd`. Computed by adding the minutes remaining
 * until quietEnd to `date`, so it stays timezone-correct without a tz library.
 * If `date` is not actually within quiet hours, returns `date` unchanged.
 * (DST transitions can shift the result by up to an hour; the release cron
 * re-checks quiet hours before sending, so a small drift is harmless.)
 */
export function nextPermittedTime(
  date: Date,
  timeZone: string,
  quietStart = "21:00",
  quietEnd = "08:00"
): Date {
  if (!isWithinQuietHours(date, timeZone, quietStart, quietEnd)) return date;
  const { minutes } = localDayAndMinutes(date, timeZone);
  const end = minutesOfDay(quietEnd);
  // Minutes from now until the next occurrence of quietEnd (1..1440).
  let delta = (end - minutes + 1440) % 1440;
  if (delta === 0) delta = 1440;
  return new Date(date.getTime() + delta * 60_000);
}
