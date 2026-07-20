import { describe, it, expect } from "vitest";
import {
  isWithinBusinessHours,
  isWithinQuietHours,
  DEFAULT_BUSINESS_HOURS,
} from "@/lib/business-hours";

const TZ = "America/Chicago";

// 2026-07-20 is a Monday. 15:00 UTC = 10:00 CDT.
const mondayMorning = new Date("2026-07-20T15:00:00Z");
// 03:00 UTC Tue = 22:00 CDT Mon
const mondayNight = new Date("2026-07-21T03:00:00Z");
// Sunday 16:00 UTC = 11:00 CDT
const sunday = new Date("2026-07-19T16:00:00Z");

describe("isWithinBusinessHours", () => {
  it("is open Monday 10am local", () => {
    expect(isWithinBusinessHours(mondayMorning, DEFAULT_BUSINESS_HOURS, TZ)).toBe(true);
  });
  it("is closed Monday 10pm local", () => {
    expect(isWithinBusinessHours(mondayNight, DEFAULT_BUSINESS_HOURS, TZ)).toBe(false);
  });
  it("is closed Sunday (marked closed)", () => {
    expect(isWithinBusinessHours(sunday, DEFAULT_BUSINESS_HOURS, TZ)).toBe(false);
  });
  it("respects timezone differences", () => {
    // 10:00 CDT Monday is 08:00 PDT — still within 08:00-17:00 in LA, but
    // 23:30 UTC = 18:30 CDT is after close in Chicago while 16:30 in LA is open.
    const evening = new Date("2026-07-20T23:30:00Z");
    expect(isWithinBusinessHours(evening, DEFAULT_BUSINESS_HOURS, "America/Chicago")).toBe(false);
    expect(isWithinBusinessHours(evening, DEFAULT_BUSINESS_HOURS, "America/Los_Angeles")).toBe(true);
  });
});

describe("isWithinQuietHours", () => {
  it("flags 10pm local as quiet (21:00-08:00 window)", () => {
    expect(isWithinQuietHours(mondayNight, TZ)).toBe(true);
  });
  it("does not flag 10am local", () => {
    expect(isWithinQuietHours(mondayMorning, TZ)).toBe(false);
  });
  it("flags early morning before 8am", () => {
    const early = new Date("2026-07-20T11:30:00Z"); // 06:30 CDT
    expect(isWithinQuietHours(early, TZ)).toBe(true);
  });
  it("handles a same-day window", () => {
    const noonish = new Date("2026-07-20T18:00:00Z"); // 13:00 CDT
    expect(isWithinQuietHours(noonish, TZ, "12:00", "14:00")).toBe(true);
    expect(isWithinQuietHours(mondayMorning, TZ, "12:00", "14:00")).toBe(false);
  });
});
