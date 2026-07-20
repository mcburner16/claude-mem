import { describe, it, expect } from "vitest";
import {
  parseYesNo,
  parseName,
  parseZip,
  parseUrgency,
  isStopKeyword,
  isHelpKeyword,
  isHumanRequest,
  isRestartKeyword,
} from "@/lib/conversation/parsers";

describe("parseYesNo", () => {
  it.each(["YES", "yes", "Yeah", "yep", "sure", "ok", "Yes please!", "y"])(
    "parses '%s' as yes",
    (s) => expect(parseYesNo(s)).toBe("yes")
  );
  it.each(["no", "NO", "nope", "nah", "wrong number", "not interested", "n"])(
    "parses '%s' as no",
    (s) => expect(parseYesNo(s)).toBe("no")
  );
  it.each(["maybe", "who is this", "what do you mean", "my ac is broken"])(
    "parses '%s' as unclear",
    (s) => expect(parseYesNo(s)).toBe("unclear")
  );
});

describe("parseName", () => {
  it("extracts plain names and title-cases them", () => {
    expect(parseName("sarah jones")).toBe("Sarah Jones");
  });
  it("strips 'my name is' prefixes", () => {
    expect(parseName("My name is Bob O'Brien")).toBe("Bob O'Brien");
    expect(parseName("this is Mike")).toBe("Mike");
    expect(parseName("I'm Dana")).toBe("Dana");
  });
  it("rejects non-name answers", () => {
    expect(parseName("75201")).toBeNull();
    expect(parseName("yes")).toBeNull();
    expect(parseName("")).toBeNull();
    expect(parseName("a".repeat(80))).toBeNull();
  });
});

describe("parseZip", () => {
  it("finds a ZIP anywhere in the message", () => {
    expect(parseZip("75201")).toBe("75201");
    expect(parseZip("it's 75201 thanks")).toBe("75201");
    expect(parseZip("75201-1234")).toBe("75201");
  });
  it("rejects messages without a 5-digit ZIP", () => {
    expect(parseZip("dallas")).toBeNull();
    expect(parseZip("123")).toBeNull();
  });
});

describe("parseUrgency", () => {
  it("classifies emergencies/today", () => {
    expect(parseUrgency("ASAP")!.level).toBe("emergency_today");
    expect(parseUrgency("today if possible")!.level).toBe("emergency_today");
  });
  it("classifies soon", () => {
    expect(parseUrgency("this week")!.level).toBe("soon");
  });
  it("classifies flexible", () => {
    expect(parseUrgency("whenever, no rush")!.level).toBe("flexible");
  });
  it("keeps the raw text verbatim", () => {
    expect(parseUrgency("Today if possible")!.raw).toBe("Today if possible");
  });
});

describe("keywords", () => {
  it("recognizes all Twilio stop words", () => {
    for (const s of ["STOP", "stop", "Unsubscribe", "CANCEL", "END", "QUIT", "STOPALL"]) {
      expect(isStopKeyword(s)).toBe(true);
    }
    expect(isStopKeyword("please stop asking")).toBe(false);
  });
  it("recognizes HELP", () => {
    expect(isHelpKeyword("HELP")).toBe(true);
    expect(isHelpKeyword("help me my ac is broken")).toBe(false);
  });
  it("recognizes human requests", () => {
    expect(isHumanRequest("can I talk to a person")).toBe(true);
    expect(isHumanRequest("I want to speak to a human")).toBe(true);
    expect(isHumanRequest("just call me")).toBe(true);
    expect(isHumanRequest("my name is Person Smith")).toBe(false);
  });
  it("recognizes restart", () => {
    expect(isRestartKeyword("start over")).toBe(true);
    expect(isRestartKeyword("restart")).toBe(true);
  });
});
