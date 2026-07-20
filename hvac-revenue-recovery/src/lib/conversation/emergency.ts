/**
 * Life-safety keyword detection. If any of these appear in an inbound message,
 * the normal qualification flow stops and the configurable emergency response
 * is sent instead. Deliberately biased toward false positives: a false alarm
 * costs one awkward text; a miss could cost a life.
 */

const EMERGENCY_PATTERNS: RegExp[] = [
  /\bsmell(ing|s)?\s+(natural\s+)?gas\b/i,
  /\bgas\s+(leak|smell|odou?r)\b/i,
  /\bleak(ing)?\s+gas\b/i,
  /\bcarbon\s*monoxide\b/i,
  /\bco\s+(alarm|detector|monitor)\b/i,
  /\b(smoke|smoking)\b.*\b(unit|furnace|vent|system|house|panel)\b/i,
  /\b(furnace|unit|system|panel|wire|wiring)\b.*\b(smoke|smoking|sparks?|sparking|burning|flames?)\b/i,
  /\bsmell\s+(of\s+)?(smoke|burning|something burning)\b/i,
  /\bburning\s+smell\b/i,
  /\bon\s+fire\b/i,
  /\bfire\b.*\b(furnace|unit|house|attic|garage)\b/i,
  /\b(flames?|sparks?)\b/i,
  /\bexplo(de|sion|ding)\b/i,
  /\brotten\s+egg(s)?\b/i, // classic natural-gas odorant description
];

export function detectEmergency(body: string): boolean {
  return EMERGENCY_PATTERNS.some((re) => re.test(body));
}
