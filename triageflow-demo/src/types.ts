export type UrgencyLevel = 'Emergency' | 'Same-Day' | 'Routine' | 'Needs More Info';
export type RequestStatus =
  | 'New'
  | 'Needs More Info'
  | 'Ready for Review'
  | 'Approved for Dispatch'
  | 'Vendor Contacted'
  | 'Scheduled'
  | 'Completed';
export type Category =
  | 'Plumbing'
  | 'HVAC'
  | 'Electrical'
  | 'Appliance'
  | 'Pest'
  | 'Doors/Locks'
  | 'General Maintenance'
  | 'Other';

export interface MaintenanceRequest {
  id: string;
  residentName: string;
  propertyName: string;
  unitNumber: string;
  phone: string;
  email: string;
  category: Category;
  description: string;
  activePropertyDamage: 'yes' | 'no' | 'not_sure';
  hazardPresent: 'yes' | 'no' | 'not_sure';
  safeAccess: 'yes' | 'no' | 'not_sure';
  vulnerableOccupants: 'none' | 'young_child' | 'elderly' | 'medical' | 'multiple';
  createdAt: string;
  urgency: UrgencyLevel;
  status: RequestStatus;
  triageResult: TriageResult;
}

export interface TriageResult {
  urgency: UrgencyLevel;
  category: Category;
  suggestedVendor: string;
  aiRecommendation: string;
  tenantSummary: string;
  pmsWorkOrderSummary: string;
  tenantSmsReply: string;
  managerMobileAlert: string;
  vendorDispatchNotes: string;
  internalAuditLog: string;
  recommendedNextStep: string;
  estimatedStaffTimeSaved: string;
  followUpMessagesAvoided: number;
  estimatedResponseTimeImprovement: string;
}
