import type { MaintenanceRequest } from './types';

export const DEMO_REQUESTS: MaintenanceRequest[] = [
  {
    id: 'demo-1',
    residentName: 'Maria Santos',
    propertyName: 'Sunset Gardens',
    unitNumber: '101A',
    phone: '555-0101',
    email: 'maria.santos@email.com',
    category: 'Plumbing',
    description: 'Water is actively spraying from under the sink and flooding the cabinet and floor.',
    activePropertyDamage: 'yes',
    hazardPresent: 'no',
    safeAccess: 'yes',
    vulnerableOccupants: 'none',
    createdAt: '2026-05-30T08:15:00Z',
    urgency: 'Emergency',
    status: 'Ready for Review',
    triageResult: {
      urgency: 'Emergency',
      category: 'Plumbing',
      suggestedVendor: 'Emergency plumber',
      aiRecommendation:
        'Emergency Plumbing issue in Unit 101A, Sunset Gardens. Resident Maria Santos reports active water spraying from kitchen sink supply line, flooding cabinet and floor. Active property damage confirmed. Immediate emergency plumber dispatch required pending manager approval.',
      tenantSummary:
        'Plumbing issue in Unit 101A — Sunset Gardens. Resident Maria Santos reports water actively spraying from under the sink, flooding the cabinet and floor. Urgency assessed as Emergency.',
      pmsWorkOrderSummary:
        'EMERGENCY: Active water leak under kitchen sink — Unit 101A, Sunset Gardens. Water spraying from supply line, flooding cabinet and floor. Immediate plumber dispatch required. Resident has access. No hazards reported.',
      tenantSmsReply:
        "Hi Maria — we've received your maintenance request and flagged it as Emergency priority due to the active water leak. A manager is reviewing now and will contact you shortly about next steps. Please shut off the water supply valve under the sink if you can do so safely.",
      managerMobileAlert:
        '🚨 EMERGENCY — Active water leak, Unit 101A Sunset Gardens. Maria Santos. Kitchen sink supply line spraying. Immediate plumber needed. Resident has access.',
      vendorDispatchNotes:
        'Emergency water leak — kitchen sink supply line. Unit 101A, Sunset Gardens. Resident Maria Santos available. Shut-off valve may need replacement. Bring pipe repair supplies.',
      internalAuditLog:
        '2026-05-30 | Emergency triage | Active water leak reported by resident. Auto-flagged: activePropertyDamage=yes. Manager review required before dispatch.',
      recommendedNextStep:
        'Immediate manager review for emergency plumber dispatch. Confirm resident access and safety status.',
      estimatedStaffTimeSaved: '~22 minutes',
      followUpMessagesAvoided: 3,
      estimatedResponseTimeImprovement: '~40 minutes faster',
    },
  },
  {
    id: 'demo-2',
    residentName: 'James Okafor',
    propertyName: 'Maplewood Commons',
    unitNumber: '305C',
    phone: '555-0305',
    email: 'james.okafor@email.com',
    category: 'Other',
    description: "I smell gas near my stove and it's been getting stronger for the past hour.",
    activePropertyDamage: 'not_sure',
    hazardPresent: 'yes',
    safeAccess: 'yes',
    vulnerableOccupants: 'none',
    createdAt: '2026-05-30T07:45:00Z',
    urgency: 'Emergency',
    status: 'Ready for Review',
    triageResult: {
      urgency: 'Emergency',
      category: 'Other',
      suggestedVendor: 'Gas utility / licensed plumber',
      aiRecommendation:
        'EMERGENCY: Resident James Okafor reports a gas smell near the stove that has been intensifying over the past hour in Unit 305C. Hazard confirmed. Immediate response required. Resident should evacuate if smell is strong and contact the gas utility company. Manager must review before any vendor dispatch.',
      tenantSummary:
        "Gas odor issue in Unit 305C — Maplewood Commons. Resident James Okafor reports gas smell near stove increasing in intensity over the past hour. Potential hazard present. Urgency assessed as Emergency.",
      pmsWorkOrderSummary:
        "EMERGENCY: Gas smell reported — Unit 305C, Maplewood Commons. Resident James Okafor. Gas odor near stove, intensifying over 1 hour. Hazard flag set. Contact gas utility immediately. Manager approval required before dispatch.",
      tenantSmsReply:
        "Hi James — we've received your maintenance request and flagged it as Emergency priority due to the reported gas smell. A manager is reviewing immediately. If the smell is strong, please evacuate the unit and call the gas utility emergency line at once. Do not use any switches or open flames.",
      managerMobileAlert:
        '🚨 EMERGENCY — Gas smell, Unit 305C Maplewood Commons. James Okafor. Odor near stove, strengthening for 1 hour. Hazard confirmed. Gas utility or licensed plumber required immediately.',
      vendorDispatchNotes:
        'EMERGENCY gas odor call — Unit 305C, Maplewood Commons. Resident reports gas smell near stove intensifying for over an hour. Hazard flag set. Coordinate with gas utility before entering. Resident James Okafor on-site.',
      internalAuditLog:
        '2026-05-30 | Emergency triage | Gas smell reported by resident. Auto-flagged: hazardPresent=yes. Gas utility notification and manager review required before any on-site action.',
      recommendedNextStep:
        'Immediate manager review. Contact gas utility emergency line. Advise resident to evacuate if odor is strong. Do not dispatch vendor without utility clearance.',
      estimatedStaffTimeSaved: '~30 minutes',
      followUpMessagesAvoided: 4,
      estimatedResponseTimeImprovement: '~60 minutes faster',
    },
  },
  {
    id: 'demo-3',
    residentName: 'Maria Lopez',
    propertyName: 'Pine Ridge Apartments',
    unitNumber: '204B',
    phone: '555-0204',
    email: 'maria.lopez@email.com',
    category: 'HVAC',
    description:
      "My AC isn't working and it is really hot inside. It's been like this since yesterday. I have a 2-year-old and my elderly parent is visiting.",
    activePropertyDamage: 'no',
    hazardPresent: 'no',
    safeAccess: 'yes',
    vulnerableOccupants: 'multiple',
    createdAt: '2026-05-30T09:00:00Z',
    urgency: 'Same-Day',
    status: 'Ready for Review',
    triageResult: {
      urgency: 'Same-Day',
      category: 'HVAC',
      suggestedVendor: 'HVAC technician',
      aiRecommendation:
        "Resident reports AC unit not functioning with indoor temperature reaching 84°F. Vulnerable occupants present — 2-year-old child and elderly adult. Thermostat has been checked but breaker has not. Air is blowing warm. Recommend same-day HVAC technician dispatch pending manager approval. Resident should keep phone available and confirm access window.",
      tenantSummary:
        "AC not working in Unit 204B — Pine Ridge Apartments. Resident reports warm air blowing, indoor temp 84°F. Thermostat checked, breaker not verified. Vulnerable occupants (infant + elderly) present. Issue persisting since yesterday.",
      pmsWorkOrderSummary:
        "SAME-DAY PRIORITY: AC not functioning — Unit 204B, Pine Ridge Apartments. Resident Maria Lopez. Indoor temp ~84°F, air blowing warm. Thermostat checked, breaker not confirmed. Vulnerable occupants: 2-year-old child + elderly visitor. Manager approval required before HVAC dispatch.",
      tenantSmsReply:
        "Hi Maria — thank you for letting us know. We've flagged your AC issue as high priority given the heat and your household situation. A manager is reviewing now and will reach out shortly to confirm next steps. In the meantime, if possible please open windows or use a fan for ventilation.",
      managerMobileAlert:
        '⚠️ SAME-DAY — AC outage, Unit 204B Pine Ridge. Maria Lopez. Indoor temp 84°F. Vulnerable occupants: infant + elderly adult. Thermostat checked, breaker not confirmed. HVAC dispatch recommended pending your approval.',
      vendorDispatchNotes:
        'HVAC service call — Unit 204B, Pine Ridge Apartments. AC unit not cooling. Indoor temp ~84°F. Thermostat checked, breaker status unknown. System blowing warm air. Resident available, vulnerable occupants present — prioritize response.',
      internalAuditLog:
        '2026-05-30 | Same-Day triage | HVAC failure with vulnerable occupants. Auto-flagged: HVAC + vulnerableOccupants=multiple + elevated temp indicators. Manager review required before dispatch.',
      recommendedNextStep:
        'Manager review for urgent HVAC dispatch. Ask resident to keep phone available and confirm access instructions.',
      estimatedStaffTimeSaved: '~25 minutes',
      followUpMessagesAvoided: 3,
      estimatedResponseTimeImprovement: '~35 minutes faster',
    },
  },
  {
    id: 'demo-4',
    residentName: 'Priya Nair',
    propertyName: 'Cedar Creek',
    unitNumber: '2F',
    phone: '555-0002',
    email: 'priya.nair@email.com',
    category: 'Doors/Locks',
    description:
      "My front door lock is broken and I can't lock my apartment. The key turns but the latch doesn't catch.",
    activePropertyDamage: 'no',
    hazardPresent: 'no',
    safeAccess: 'yes',
    vulnerableOccupants: 'none',
    createdAt: '2026-05-30T10:30:00Z',
    urgency: 'Same-Day',
    status: 'New',
    triageResult: {
      urgency: 'Same-Day',
      category: 'Doors/Locks',
      suggestedVendor: 'Locksmith',
      aiRecommendation:
        "Resident Priya Nair reports a broken front door lock in Unit 2F — the key turns but the latch does not engage, leaving the apartment unsecured. Security concern flagged. Same-day locksmith dispatch recommended pending manager approval.",
      tenantSummary:
        "Door lock failure in Unit 2F — Cedar Creek. Resident Priya Nair reports front door latch not catching — key turns but door will not lock. Security concern present. Urgency assessed as Same-Day.",
      pmsWorkOrderSummary:
        "SAME-DAY PRIORITY: Broken door lock — Unit 2F, Cedar Creek. Resident Priya Nair. Front door latch mechanism not engaging. Apartment currently unsecured. Locksmith dispatch recommended. Manager approval required before dispatch.",
      tenantSmsReply:
        "Hi Priya — thank you for reporting this. We've flagged your door lock issue as high priority since it affects your unit's security. A manager is reviewing now and will confirm a locksmith appointment shortly.",
      managerMobileAlert:
        '⚠️ SAME-DAY — Broken door lock, Unit 2F Cedar Creek. Priya Nair. Front door latch not engaging, unit unsecured. Locksmith dispatch needed pending your approval.',
      vendorDispatchNotes:
        'Lock repair — Unit 2F, Cedar Creek. Front door latch mechanism not engaging — key turns but latch does not catch. May need latch assembly replacement or full lock replacement. Resident Priya Nair available for access.',
      internalAuditLog:
        "2026-05-30 | Same-Day triage | Door lock failure reported. Auto-flagged: Doors/Locks category + can't lock condition. Security concern noted. Manager review required before dispatch.",
      recommendedNextStep:
        'Manager review for same-day locksmith dispatch. Confirm resident access window and whether temporary security measures are needed.',
      estimatedStaffTimeSaved: '~18 minutes',
      followUpMessagesAvoided: 2,
      estimatedResponseTimeImprovement: '~25 minutes faster',
    },
  },
  {
    id: 'demo-5',
    residentName: 'David Chen',
    propertyName: 'Sunset Gardens',
    unitNumber: '215B',
    phone: '555-0215',
    email: 'david.chen@email.com',
    category: 'General Maintenance',
    description: 'My smoke detector keeps chirping every 30 seconds. It needs a new battery.',
    activePropertyDamage: 'no',
    hazardPresent: 'no',
    safeAccess: 'yes',
    vulnerableOccupants: 'none',
    createdAt: '2026-05-30T11:00:00Z',
    urgency: 'Routine',
    status: 'New',
    triageResult: {
      urgency: 'Routine',
      category: 'General Maintenance',
      suggestedVendor: 'Maintenance staff',
      aiRecommendation:
        'Resident David Chen reports a chirping smoke detector in Unit 215B — chirping every 30 seconds indicating a low battery. Routine maintenance task. No safety hazard, no property damage. Schedule battery replacement during next available maintenance window.',
      tenantSummary:
        'Smoke detector issue in Unit 215B — Sunset Gardens. Resident David Chen reports smoke detector chirping every 30 seconds. Likely low battery. No hazard present. Urgency assessed as Routine.',
      pmsWorkOrderSummary:
        'ROUTINE: Smoke detector battery replacement — Unit 215B, Sunset Gardens. Resident David Chen. Detector chirping every 30 seconds — low battery indicator. No safety concern. Schedule during regular maintenance hours. Manager approval required before dispatch.',
      tenantSmsReply:
        "Hi David — we've received your maintenance request. We'll schedule a maintenance staff member to replace your smoke detector battery during normal business hours and will follow up to confirm your appointment.",
      managerMobileAlert:
        'ℹ️ ROUTINE — Smoke detector battery, Unit 215B Sunset Gardens. David Chen. Chirping every 30 seconds. Standard battery replacement. Schedule next available window.',
      vendorDispatchNotes:
        'Routine maintenance call — Unit 215B, Sunset Gardens. Smoke detector battery replacement needed. Detector chirping every 30 seconds. Resident David Chen available. Bring standard 9V replacement battery.',
      internalAuditLog:
        '2026-05-30 | Routine triage | Smoke detector low battery reported. No auto-flag conditions triggered. Standard maintenance scheduling appropriate.',
      recommendedNextStep:
        'Schedule maintenance staff during next available window. Confirm appointment with resident 24 hours in advance.',
      estimatedStaffTimeSaved: '~8 minutes',
      followUpMessagesAvoided: 1,
      estimatedResponseTimeImprovement: '~15 minutes faster',
    },
  },
  {
    id: 'demo-6',
    residentName: 'Aisha Williams',
    propertyName: 'Maplewood Commons',
    unitNumber: '112A',
    phone: '555-0112',
    email: 'aisha.williams@email.com',
    category: 'Plumbing',
    description:
      'My shower drain is draining very slowly. It pools up about 3 inches during a normal shower.',
    activePropertyDamage: 'no',
    hazardPresent: 'no',
    safeAccess: 'yes',
    vulnerableOccupants: 'none',
    createdAt: '2026-05-29T14:00:00Z',
    urgency: 'Routine',
    status: 'Completed',
    triageResult: {
      urgency: 'Routine',
      category: 'Plumbing',
      suggestedVendor: 'Maintenance staff or plumber',
      aiRecommendation:
        'Resident Aisha Williams reports a slow shower drain in Unit 112A that pools approximately 3 inches during a normal shower. No active leak or damage. Likely hair/debris clog. Routine drain clearing recommended during normal maintenance hours.',
      tenantSummary:
        'Plumbing issue in Unit 112A — Maplewood Commons. Resident Aisha Williams reports slow shower drain, pooling ~3 inches. No overflow or leak. Urgency assessed as Routine.',
      pmsWorkOrderSummary:
        'ROUTINE: Slow shower drain — Unit 112A, Maplewood Commons. Resident Aisha Williams. Drain pooling ~3 inches during shower. Likely hair/debris clog. Maintenance staff recommended. Manager approval required before dispatch.',
      tenantSmsReply:
        "Hi Aisha — we've received your maintenance request about the slow shower drain. We'll schedule a maintenance team member to address the clog during normal business hours and will follow up with appointment details.",
      managerMobileAlert:
        'ℹ️ ROUTINE — Slow shower drain, Unit 112A Maplewood Commons. Aisha Williams. Pooling ~3 inches. Standard drain clearing. Schedule next available window.',
      vendorDispatchNotes:
        'Routine plumbing call — Unit 112A, Maplewood Commons. Slow shower drain, pooling ~3 inches during normal shower. Likely hair/debris clog. Resident Aisha Williams available. Bring drain snake and hair clog remover.',
      internalAuditLog:
        '2026-05-29 | Routine triage | Slow drain reported. No auto-flag conditions triggered. Standard plumbing maintenance scheduling appropriate.',
      recommendedNextStep:
        'Schedule maintenance staff or plumber during next available window. Confirm appointment with resident 24 hours in advance.',
      estimatedStaffTimeSaved: '~10 minutes',
      followUpMessagesAvoided: 1,
      estimatedResponseTimeImprovement: '~20 minutes faster',
    },
  },
  {
    id: 'demo-7',
    residentName: 'Tom Bradley',
    propertyName: 'Cedar Creek',
    unitNumber: '308D',
    phone: '555-0308',
    email: 'tom.bradley@email.com',
    category: 'HVAC',
    description: 'Something is wrong with the HVAC.',
    activePropertyDamage: 'not_sure',
    hazardPresent: 'not_sure',
    safeAccess: 'yes',
    vulnerableOccupants: 'none',
    createdAt: '2026-05-30T08:45:00Z',
    urgency: 'Needs More Info',
    status: 'Needs More Info',
    triageResult: {
      urgency: 'Needs More Info',
      category: 'HVAC',
      suggestedVendor: 'Pending clarification',
      aiRecommendation:
        'Insufficient detail to accurately triage this request. Category: HVAC. The description "Something is wrong with the HVAC" does not contain enough specifics to assess urgency or assign a vendor. Follow-up questions recommended: Is the system not heating or cooling? Is there a noise or smell? What is the approximate indoor temperature? Are there any vulnerable occupants?',
      tenantSummary:
        'HVAC issue in Unit 308D — Cedar Creek. Resident Tom Bradley reports an unspecified HVAC problem. Additional details needed to assess urgency and schedule appropriate service.',
      pmsWorkOrderSummary:
        'NEEDS CLARIFICATION: Vague HVAC complaint — Unit 308D, Cedar Creek. Resident Tom Bradley. Description insufficient for triage. Follow-up required: specific symptoms, indoor temperature, access availability. Do not schedule until clarified.',
      tenantSmsReply:
        "Hi Tom — thank you for submitting your maintenance request. To properly assess and schedule your HVAC issue, we need a few more details. A team member will reach out shortly. In the meantime, could you let us know: Is the unit not heating, not cooling, or making unusual sounds? What is the approximate indoor temperature?",
      managerMobileAlert:
        '❓ NEEDS MORE INFO — Vague HVAC complaint, Unit 308D Cedar Creek. Tom Bradley. Description: "Something is wrong with the HVAC." Follow-up needed before scheduling.',
      vendorDispatchNotes:
        'Dispatch on hold pending additional resident information. Do not schedule until manager confirms. HVAC issue reported but details insufficient — Unit 308D, Cedar Creek.',
      internalAuditLog:
        '2026-05-30 | Needs More Info triage | Vague HVAC complaint. Description too brief for accurate triage. Follow-up required before any scheduling or vendor assignment.',
      recommendedNextStep:
        'Contact resident for additional details before scheduling. Clarify: exact symptoms, access availability, any safety concerns.',
      estimatedStaffTimeSaved: '~12 minutes',
      followUpMessagesAvoided: 2,
      estimatedResponseTimeImprovement: '~20 minutes faster',
    },
  },
  {
    id: 'demo-8',
    residentName: 'Rachel Kim',
    propertyName: 'Pine Ridge Apartments',
    unitNumber: '117C',
    phone: '555-0117',
    email: 'rachel.kim@email.com',
    category: 'Electrical',
    description: 'Electrical issue in unit.',
    activePropertyDamage: 'not_sure',
    hazardPresent: 'not_sure',
    safeAccess: 'not_sure',
    vulnerableOccupants: 'none',
    createdAt: '2026-05-30T09:30:00Z',
    urgency: 'Needs More Info',
    status: 'Needs More Info',
    triageResult: {
      urgency: 'Needs More Info',
      category: 'Electrical',
      suggestedVendor: 'Pending clarification',
      aiRecommendation:
        'Insufficient detail to accurately triage this request. Category: Electrical. The description "Electrical issue in unit" does not contain enough specifics to assess urgency. Electrical issues can range from a tripped breaker to a serious hazard. Follow-up questions required: What specifically is not working? Any sparks, burning smells, or flickering? Is access available?',
      tenantSummary:
        'Electrical issue in Unit 117C — Pine Ridge Apartments. Resident Rachel Kim reports an unspecified electrical problem. Additional details and access confirmation needed before scheduling.',
      pmsWorkOrderSummary:
        'NEEDS CLARIFICATION: Vague electrical complaint — Unit 117C, Pine Ridge Apartments. Resident Rachel Kim. Description insufficient for triage. Safety status unknown. Follow-up required: specific symptoms, hazard assessment, access availability.',
      tenantSmsReply:
        "Hi Rachel — thank you for your maintenance request. Electrical issues vary widely in urgency, so we need a few more details to respond appropriately. A team member will reach out shortly. Could you tell us: What is not working? Are there any sparks, burning smells, or flickering lights? Are you available for access?",
      managerMobileAlert:
        '❓ NEEDS MORE INFO — Vague electrical complaint, Unit 117C Pine Ridge. Rachel Kim. Description: "Electrical issue in unit." Safety status unknown. Follow-up and hazard assessment required.',
      vendorDispatchNotes:
        'Dispatch on hold pending additional resident information. Electrical issue reported but details insufficient — Unit 117C, Pine Ridge Apartments. Hazard and access status unknown. Do not schedule until clarified.',
      internalAuditLog:
        '2026-05-30 | Needs More Info triage | Vague electrical complaint. Safety status unknown (hazardPresent=not_sure, safeAccess=not_sure). Follow-up and hazard assessment required before any scheduling.',
      recommendedNextStep:
        'Contact resident immediately for safety assessment. Clarify: exact symptoms, any sparks/burning smells, access availability. If any safety concern is mentioned, escalate to Emergency.',
      estimatedStaffTimeSaved: '~12 minutes',
      followUpMessagesAvoided: 2,
      estimatedResponseTimeImprovement: '~20 minutes faster',
    },
  },
];
