export type AmPmPreference = 'AM' | 'PM' | 'EITHER';
export type ContactPreference = 'CALL' | 'TEXT' | 'BOTH';
export type ConfirmationStatus = 'PENDING' | 'SENT' | 'CONFIRMED';
export type VisitStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
export type View = 'week' | 'day' | 'patients' | 'confirmations' | 'settings' | 'newWeek' | 'suggestions';

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
