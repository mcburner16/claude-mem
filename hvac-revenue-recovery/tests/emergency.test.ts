import { describe, it, expect } from "vitest";
import { detectEmergency } from "@/lib/conversation/emergency";

describe("detectEmergency", () => {
  it.each([
    "I smell gas near the furnace",
    "I think there's a gas leak",
    "smelling natural gas in the kitchen",
    "my carbon monoxide alarm is going off",
    "the CO detector keeps beeping",
    "the furnace is smoking",
    "smoke coming from the unit",
    "there's a burning smell from the vents",
    "the unit is on fire",
    "I see sparks in the panel",
    "smells like rotten eggs in the house",
  ])("detects: %s", (msg) => {
    expect(detectEmergency(msg)).toBe(true);
  });

  it.each([
    "my AC is not cooling",
    "the heater won't turn on",
    "need a tune up",
    "the thermostat is blank",
    "it's blowing warm air",
    "compressor is loud",
  ])("does not flag normal issue: %s", (msg) => {
    expect(detectEmergency(msg)).toBe(false);
  });
});
