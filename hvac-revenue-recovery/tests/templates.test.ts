import { describe, it, expect } from "vitest";
import { renderTemplate } from "@/lib/templates";
import { formatLeadNotification } from "@/lib/notify";

describe("renderTemplate", () => {
  it("substitutes variables", () => {
    expect(renderTemplate("Hi from {{company_name}}!", { company_name: "Acme HVAC" })).toBe(
      "Hi from Acme HVAC!"
    );
  });
  it("renders unknown/missing variables as empty, never as literal braces", () => {
    const out = renderTemplate("Hello {{name}}, this is {{company_name}}.", {
      company_name: "Acme",
    });
    expect(out).not.toContain("{{");
    expect(out).toBe("Hello , this is Acme.".replace(/\s{2,}/g, " "));
  });
});

describe("formatLeadNotification", () => {
  it("produces the owner summary with all captured fields", () => {
    const text = formatLeadNotification(
      {
        id: "abc-123",
        caller_phone: "+12145550192",
        status: "qualified",
        is_emergency: false,
        answers: {
          name: "Sarah Jones",
          issue: "AC is running but not cooling",
          system_down: true,
          urgency: "System down today",
          zip: "75201",
          callback_time: "As soon as possible",
        },
      },
      "qualified",
      "https://app.example.com"
    );
    expect(text).toContain("QUALIFIED LEAD");
    expect(text).toContain("Name: Sarah Jones");
    expect(text).toContain("Phone: +12145550192");
    expect(text).toContain("ZIP: 75201");
    expect(text).toContain("Status: qualified");
    expect(text).toContain("https://app.example.com/dashboard/leads/abc-123");
  });
});
