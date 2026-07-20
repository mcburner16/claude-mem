import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { computeTwilioSignature, validateTwilioSignature } from "@/lib/twilio/signature";

const token = "12345678901234567890123456789012";
const url = "https://example.com/api/twilio/voice";
const params = { CallSid: "CA123", From: "+12145550100", To: "+12145550200" };

describe("Twilio signature validation", () => {
  it("matches an independently computed reference HMAC", () => {
    // Reference implementation straight from Twilio's documented algorithm
    const data = url + "CallSidCA123From+12145550100To+12145550200";
    const expected = crypto.createHmac("sha1", token).update(data).digest("base64");
    expect(computeTwilioSignature(token, url, params)).toBe(expected);
  });

  it("accepts a valid signature", () => {
    const sig = computeTwilioSignature(token, url, params);
    expect(validateTwilioSignature(token, sig, url, params)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const sig = computeTwilioSignature(token, url, params);
    expect(
      validateTwilioSignature(token, sig, url, { ...params, From: "+19999999999" })
    ).toBe(false);
  });

  it("rejects a missing or malformed header", () => {
    expect(validateTwilioSignature(token, null, url, params)).toBe(false);
    expect(validateTwilioSignature(token, "nonsense", url, params)).toBe(false);
  });

  it("sorts parameters by key as Twilio does", () => {
    const sig1 = computeTwilioSignature(token, url, { B: "2", A: "1" });
    const data = url + "A1B2";
    const expected = crypto.createHmac("sha1", token).update(data).digest("base64");
    expect(sig1).toBe(expected);
  });
});
