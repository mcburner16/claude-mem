import type { MaintenanceRequest, TriageResult, UrgencyLevel, Category } from './types';

type TriageInput = Omit<MaintenanceRequest, 'id' | 'urgency' | 'status' | 'triageResult' | 'createdAt'>;

function descContains(desc: string, terms: string[]): boolean {
  const lower = desc.toLowerCase();
  return terms.some((t) => lower.includes(t));
}

function determineUrgency(input: TriageInput): UrgencyLevel {
  const desc = input.description.toLowerCase();

  // Emergency conditions
  if (input.activePropertyDamage === 'yes') return 'Emergency';
  if (input.hazardPresent === 'yes') return 'Emergency';
  if (descContains(desc, ['gas', 'smoke', 'sparks', 'sewage', 'flooding', 'flood'])) return 'Emergency';
  if (
    input.category === 'Doors/Locks' &&
    descContains(desc, ["broken", "missing", "can't lock", "won't lock", "cant lock"])
  )
    return 'Emergency';
  if (
    input.category === 'HVAC' &&
    descContains(desc, ['85°', '85 degree', '86', '87', '88', '89', '90']) &&
    input.vulnerableOccupants !== 'none'
  )
    return 'Emergency';

  // Same-Day conditions
  if (
    descContains(desc, [
      'ac',
      'a/c',
      'air conditioning',
      'heat',
      'heating',
      'hvac',
      'cooling',
      'not cooling',
    ]) ||
    input.category === 'HVAC'
  )
    return 'Same-Day';
  if (input.category === 'Doors/Locks') return 'Same-Day';
  if (input.vulnerableOccupants !== 'none') return 'Same-Day';
  if (input.category === 'Appliance' && descContains(desc, ['leak'])) return 'Same-Day';

  // Needs More Info
  const genericTerms = ['not working', 'broken', 'issue'];
  const isGenericDesc =
    input.description.trim().length < 20 ||
    (genericTerms.some((t) => desc.includes(t)) &&
      !descContains(desc, [
        'water',
        'pipe',
        'drain',
        'smoke',
        'gas',
        'heat',
        'cool',
        'lock',
        'door',
        'electric',
        'appliance',
        'pest',
      ]));
  if (
    input.description.trim().length < 20 &&
    input.safeAccess === 'not_sure' &&
    input.hazardPresent === 'not_sure'
  )
    return 'Needs More Info';
  const needsInfoCategories: string[] = ['General Maintenance', 'Other', 'HVAC', 'Electrical'];
  if (isGenericDesc && needsInfoCategories.includes(input.category))
    return 'Needs More Info';

  return 'Routine';
}

function suggestVendor(category: Category, urgency: UrgencyLevel): string {
  if (urgency === 'Needs More Info') return 'Pending clarification';
  switch (category) {
    case 'Plumbing':
      return urgency === 'Emergency' ? 'Emergency plumber' : 'Maintenance staff or plumber';
    case 'HVAC':
      return 'HVAC technician';
    case 'Electrical':
      return urgency === 'Emergency' ? 'Licensed electrician (emergency)' : 'Licensed electrician';
    case 'Appliance':
      return 'Appliance repair technician';
    case 'Pest':
      return 'Pest control service';
    case 'Doors/Locks':
      return 'Locksmith';
    case 'General Maintenance':
      return 'Maintenance staff';
    default:
      return 'Maintenance staff';
  }
}

function buildTriageResult(input: TriageInput, urgency: UrgencyLevel): TriageResult {
  const vendor = suggestVendor(input.category, urgency);
  const { category } = input;
  const today = new Date().toISOString().slice(0, 10);

  const aiRecommendation = buildAiRecommendation(input, urgency, vendor);
  const tenantSummary = buildTenantSummary(input, urgency);
  const pmsWorkOrderSummary = buildPmsWorkOrder(input, urgency, vendor);
  const tenantSmsReply = buildTenantSms(input, urgency);
  const managerMobileAlert = buildManagerAlert(input, urgency, vendor);
  const vendorDispatchNotes = buildVendorNotes(input, urgency);
  const internalAuditLog = buildAuditLog(input, urgency, today);
  const recommendedNextStep = buildNextStep(input, urgency, vendor);
  const { timeSaved, followUps, responseTime } = buildRoiEstimates(urgency);

  return {
    urgency,
    category,
    suggestedVendor: vendor,
    aiRecommendation,
    tenantSummary,
    pmsWorkOrderSummary,
    tenantSmsReply,
    managerMobileAlert,
    vendorDispatchNotes,
    internalAuditLog,
    recommendedNextStep,
    estimatedStaffTimeSaved: timeSaved,
    followUpMessagesAvoided: followUps,
    estimatedResponseTimeImprovement: responseTime,
  };
}

function buildAiRecommendation(input: TriageInput, urgency: UrgencyLevel, vendor: string): string {
  if (urgency === 'Needs More Info') {
    return `Insufficient detail to accurately triage this request. Category: ${input.category}. The description "${input.description}" does not contain enough specifics to assess urgency or assign a vendor. Follow-up questions recommended before scheduling.`;
  }
  const occupantNote =
    input.vulnerableOccupants !== 'none'
      ? ` Vulnerable occupants present (${input.vulnerableOccupants.replace('_', ' ')}), increasing priority.`
      : '';
  const damageNote = input.activePropertyDamage === 'yes' ? ' Active property damage reported.' : '';
  const hazardNote = input.hazardPresent === 'yes' ? ' Potential hazard present.' : '';
  return `${urgency} priority ${input.category} issue in Unit ${input.unitNumber}, ${input.propertyName}. Resident ${input.residentName} reports: "${input.description}"${damageNote}${hazardNote}${occupantNote} Recommended action: ${vendor} dispatch pending manager approval.`;
}

function buildTenantSummary(input: TriageInput, urgency: UrgencyLevel): string {
  const { category, description, unitNumber, propertyName, residentName } = input;
  return `${category} issue in Unit ${unitNumber} — ${propertyName}. Resident ${residentName} reports: ${description.trim()} Urgency assessed as ${urgency}.`;
}

function buildPmsWorkOrder(input: TriageInput, urgency: UrgencyLevel, vendor: string): string {
  const prefix =
    urgency === 'Emergency'
      ? 'EMERGENCY'
      : urgency === 'Same-Day'
      ? 'SAME-DAY PRIORITY'
      : urgency === 'Needs More Info'
      ? 'NEEDS CLARIFICATION'
      : 'ROUTINE';
  return `${prefix}: ${input.category} issue — Unit ${input.unitNumber}, ${input.propertyName}. Resident ${input.residentName} (${input.phone}). Description: ${input.description.trim()} Suggested vendor: ${vendor}. Manager approval required before dispatch.`;
}

function buildTenantSms(input: TriageInput, urgency: UrgencyLevel): string {
  const name = input.residentName.split(' ')[0];
  if (urgency === 'Emergency') {
    return `Hi ${name} — we've received your maintenance request and flagged it as Emergency priority. A manager is reviewing now and will contact you shortly. If there is any immediate safety risk, please evacuate and call 911.`;
  }
  if (urgency === 'Same-Day') {
    return `Hi ${name} — thank you for letting us know. We've flagged your ${input.category} issue as high priority. A manager is reviewing now and will reach out shortly to confirm next steps.`;
  }
  if (urgency === 'Needs More Info') {
    return `Hi ${name} — thank you for submitting your maintenance request. To properly assess and schedule your ${input.category} issue, we need a few more details. A team member will reach out shortly.`;
  }
  return `Hi ${name} — we've received your maintenance request for a ${input.category} issue in Unit ${input.unitNumber}. We'll schedule a technician during normal business hours and follow up to confirm the appointment.`;
}

function buildManagerAlert(input: TriageInput, urgency: UrgencyLevel, vendor: string): string {
  const emoji =
    urgency === 'Emergency' ? '🚨' : urgency === 'Same-Day' ? '⚠️' : urgency === 'Needs More Info' ? '❓' : 'ℹ️';
  return `${emoji} ${urgency.toUpperCase()} — ${input.category}, Unit ${input.unitNumber} ${input.propertyName}. ${input.residentName}. ${input.description.substring(0, 80).trim()}${input.description.length > 80 ? '...' : ''} Suggested: ${vendor}. Review required before dispatch.`;
}

function buildVendorNotes(input: TriageInput, urgency: UrgencyLevel): string {
  if (urgency === 'Needs More Info') {
    return 'Dispatch on hold pending additional resident information. Do not schedule until manager confirms.';
  }
  const accessNote =
    input.safeAccess === 'yes'
      ? 'Resident available for access.'
      : input.safeAccess === 'no'
      ? 'Confirm access arrangements with resident before arriving.'
      : 'Access not confirmed — contact resident before arrival.';
  const occupantNote =
    input.vulnerableOccupants !== 'none' ? ' Vulnerable occupants present — prioritize response.' : '';
  return `${urgency} ${input.category} service call — Unit ${input.unitNumber}, ${input.propertyName}. Description: ${input.description.trim()} ${accessNote}${occupantNote}`;
}

function buildAuditLog(input: TriageInput, urgency: UrgencyLevel, today: string): string {
  const flags: string[] = [];
  if (input.activePropertyDamage === 'yes') flags.push('activePropertyDamage=yes');
  if (input.hazardPresent === 'yes') flags.push('hazardPresent=yes');
  if (input.vulnerableOccupants !== 'none') flags.push(`vulnerableOccupants=${input.vulnerableOccupants}`);
  if (input.safeAccess === 'not_sure') flags.push('safeAccess=not_sure');
  const flagStr = flags.length > 0 ? `Auto-flagged: ${flags.join(', ')}. ` : 'No auto-flag conditions triggered. ';
  return `${today} | ${urgency} triage | ${input.category} request from ${input.residentName}, Unit ${input.unitNumber}. ${flagStr}Manager review required before dispatch.`;
}

function buildNextStep(_input: TriageInput, urgency: UrgencyLevel, vendor: string): string {
  if (urgency === 'Emergency') {
    return `Immediate manager review for emergency ${vendor} dispatch. Confirm resident access and safety status.`;
  }
  if (urgency === 'Same-Day') {
    return `Manager review for same-day ${vendor} dispatch. Ask resident to confirm access window and keep phone available.`;
  }
  if (urgency === 'Needs More Info') {
    return `Contact resident for additional details before scheduling. Clarify: exact symptoms, access availability, any safety concerns.`;
  }
  return `Schedule ${vendor} during next available maintenance window. Confirm appointment with resident 24 hours in advance.`;
}

function buildRoiEstimates(urgency: UrgencyLevel): {
  timeSaved: string;
  followUps: number;
  responseTime: string;
} {
  switch (urgency) {
    case 'Emergency':
      return { timeSaved: '~22 minutes', followUps: 3, responseTime: '~40 minutes faster' };
    case 'Same-Day':
      return { timeSaved: '~25 minutes', followUps: 3, responseTime: '~35 minutes faster' };
    case 'Needs More Info':
      return { timeSaved: '~12 minutes', followUps: 2, responseTime: '~20 minutes faster' };
    default:
      return { timeSaved: '~10 minutes', followUps: 1, responseTime: '~20 minutes faster' };
  }
}

export function runTriage(
  input: Omit<MaintenanceRequest, 'id' | 'urgency' | 'status' | 'triageResult' | 'createdAt'>
): TriageResult {
  const urgency = determineUrgency(input);
  return buildTriageResult(input, urgency);
}
