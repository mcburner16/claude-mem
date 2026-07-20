/**
 * Minimal {{var}} template rendering for SMS/email templates.
 * Unknown variables render as empty string so a bad template never leaks
 * "{{name}}" to a customer.
 */
export function renderTemplate(
  template: string,
  vars: Record<string, string | undefined>
): string {
  return template
    .replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => vars[key] ?? "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
