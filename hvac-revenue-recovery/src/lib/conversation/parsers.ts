/**
 * Deterministic free-text parsers for the SMS qualification flow.
 * Intentionally simple: cover the common phrasings, and escalate to a human
 * instead of guessing when input is ambiguous.
 */

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export function isStopKeyword(body: string): boolean {
  // Twilio's standard opt-out keywords
  return /^(stop|stopall|unsubscribe|cancel|end|quit)$/i.test(body.trim());
}

export function isStartKeyword(body: string): boolean {
  return /^(start|unstop|yes start)$/i.test(body.trim());
}

export function isHelpKeyword(body: string): boolean {
  return /^(help|info)$/i.test(body.trim());
}

export function isRestartKeyword(body: string): boolean {
  return /^(restart|start over|reset)$/i.test(body.trim());
}

export function isHumanRequest(body: string): boolean {
  const n = normalize(body);
  return (
    /\b(talk|speak|call)\b.*\b(person|human|someone|somebody|agent|rep)\b/.test(n) ||
    /\b(real person|human being|stop texting me questions)\b/.test(n) ||
    /^(call me|just call me|can you call me)\b/.test(n)
  );
}

/** yes / no / unclear for consent and system-down questions. */
export function parseYesNo(body: string): "yes" | "no" | "unclear" {
  const n = normalize(body).replace(/[.!?]+$/g, "");
  if (/^(y|yes|yeah|yep|yea|sure|ok|okay|yes please|please|correct|si|sí|definitely|absolutely|of course|ya|yup)$/.test(n)) {
    return "yes";
  }
  if (/^(yes\b|yeah\b|yep\b)/.test(n) && n.length < 40) return "yes";
  if (/^(n|no|nope|nah|no thanks|no thank you|not interested|wrong number|i didn'?t call|didn'?t call)$/.test(n)) {
    return "no";
  }
  if (/^(no\b|nope\b|nah\b)/.test(n) && n.length < 40) return "no";
  return "unclear";
}

/** Extract a plausible person name. Rejects obvious non-answers. */
export function parseName(body: string): string | null {
  let n = body.trim().replace(/[.!?]+$/g, "");
  // strip common prefixes: "my name is X", "this is X", "it's X", "I'm X"
  n = n.replace(/^(my name('?s| is)|this is|it'?s|i'?m|im|name is|name:)\s+/i, "");
  n = n.trim();
  if (n.length < 2 || n.length > 60) return null;
  // must look like a name: letters, spaces, hyphens, apostrophes, periods
  if (!/^[a-zA-Z][a-zA-Z .'-]*$/.test(n)) return null;
  const lowered = n.toLowerCase();
  if (["yes", "no", "why", "who is this", "what"].includes(lowered)) return null;
  // Title-case it
  return n
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Any non-trivial text is accepted as an issue description. */
export function parseIssue(body: string): string | null {
  const n = body.trim();
  if (n.length < 3 || n.length > 500) return null;
  return n;
}

export type UrgencyLevel = "emergency_today" | "soon" | "flexible";

/** Map free text to a coarse urgency level. */
export function parseUrgency(body: string): { level: UrgencyLevel; raw: string } | null {
  const n = normalize(body);
  if (n.length < 1 || n.length > 300) return null;
  if (
    /\b(asap|emergency|urgent|right away|immediately|today|now|as soon as possible|soon as you can)\b/.test(n) ||
    /\b(no (ac|air|heat)|completely (down|out))\b/.test(n)
  ) {
    return { level: "emergency_today", raw: body.trim() };
  }
  if (/\b(tomorrow|this week|next day or two|couple days|few days|soon)\b/.test(n)) {
    return { level: "soon", raw: body.trim() };
  }
  if (/\b(whenever|no rush|next week|flexible|anytime|not urgent)\b/.test(n)) {
    return { level: "flexible", raw: body.trim() };
  }
  // Any short answer we don't classify still gets stored verbatim as "soon"
  if (n.length <= 100) return { level: "soon", raw: body.trim() };
  return null;
}

/** Extract a 5-digit US ZIP code from free text. */
export function parseZip(body: string): string | null {
  const m = body.match(/\b(\d{5})(?:-\d{4})?\b/);
  return m ? m[1] : null;
}

/** Callback preference — accept most short free text. */
export function parseCallbackTime(body: string): string | null {
  const n = body.trim();
  if (n.length < 2 || n.length > 200) return null;
  return n;
}
