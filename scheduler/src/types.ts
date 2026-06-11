export type AmPmPreference = 'AM' | 'PM' | 'EITHER';
export type ContactPreference = 'CALL' | 'TEXT' | 'BOTH';
export type ConfirmationStatus = 'PENDING' | 'SENT' | 'CONFIRMED';
export type VisitStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
export type View = 'week' | 'day' | 'patients' | 'confirmations' | 'settings' | 'newWeek' | 'suggestions' | 'paycheck';

export interface Patient {
  id: string;
  name: string;
  phoneNumber: string;
  address: string;
  lat: number;
  lng: number;
  amPmPreference: AmPmPreference;
  contactPreference: ContactPreference;
  defaultWeeklyVisits: number;
  defaultVisitDuration: number; // minutes
  pointValue: number; // productivity points per visit (1.0 standard, 2.0 for evals/SOC)
  notes: string;
  archived: boolean;
}

export interface WeekPatient {
  patientId: string;
  requiredVisits: number;
}

export interface Week {
  id: string;
  startDate: string; // ISO date of Monday
  patients: WeekPatient[];
}

export interface Visit {
  id: string;
  weekId: string;
  patientId: string;
  date: string; // ISO date
  timeBlock: 'AM' | 'PM';
  specificTime?: string; // HH:MM
  estimatedDuration: number; // minutes
  status: VisitStatus;
  pinned: boolean;
  confirmationStatus: ConfirmationStatus;
  pointValueOverride?: number; // override patient default for evals, SOC, etc.
}

export interface TimeBlock {
  id: string;
  label: string;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  recurrenceRule?: string; // 'DAILY' | 'WEEKDAYS' | specific date ISO
  date?: string; // for one-off blocks
}

export interface AppSettings {
  amWindowStart: string; // HH:MM
  amWindowEnd: string;
  pmWindowStart: string;
  pmWindowEnd: string;
  workingDays: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  defaultVisitDuration: number;
  clinicianName: string;
  agencyName: string;
  messageTemplate: string;
  weeklyProductivityTarget: number; // points per week
  ppvRate: number; // $ per visit
  mileageRate: number; // $ per mile
  defaultNvaHourlyRate: number; // $ per hour for NVA entries
}

export interface NVAEntry {
  id: string;
  date: string; // ISO date
  description: string; // e.g. "Team meeting", "In-service", "SOC documentation"
  hours: number;
  hourlyRate: number; // $ per hour
}

export interface SchedulingSession {
  id: string;
  date: string;
  activeSeconds: number;
}

export interface Suggestion {
  id: string;
  type: 'swap' | 'balance' | 'cluster';
  message: string;
  visitIds: string[];
  targetDate?: string;
  targetTimeBlock?: 'AM' | 'PM';
  estimatedSavingMinutes?: number;
}
