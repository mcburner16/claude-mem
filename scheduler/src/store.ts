import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Patient, Week, Visit, TimeBlock, AppSettings, SchedulingSession, Suggestion, View } from './types';
import { generateSuggestions } from './utils/scheduling';
import { seedData } from './data/seed';

const defaultSettings: AppSettings = {
  amWindowStart: '08:00',
  amWindowEnd: '12:00',
  pmWindowStart: '12:00',
  pmWindowEnd: '17:00',
  workingDays: [1, 2, 3, 4, 5],
  defaultVisitDuration: 45,
  clinicianName: 'Your Name',
  agencyName: 'Your Agency',
  messageTemplate:
    'Hi {firstName}, this is {clinicianName} from {agencyName}. I have you scheduled for {day} between {timeWindow}. Does that work for you?',
};

interface AppState {
  patients: Patient[];
  weeks: Week[];
  visits: Visit[];
  timeBlocks: TimeBlock[];
  settings: AppSettings;
  sessions: SchedulingSession[];
  currentWeekId: string | null;
  currentView: View;
  selectedDate: string | null;
  schedulingStartTime: number | null;
  suggestions: Suggestion[];

  // Patient actions
  addPatient: (patient: Patient) => void;
  updatePatient: (id: string, updates: Partial<Patient>) => void;
  archivePatient: (id: string) => void;

  // Visit actions
  addVisit: (visit: Visit) => void;
  updateVisit: (id: string, updates: Partial<Visit>) => void;
  cancelVisit: (id: string) => void;
  completeVisit: (id: string) => void;
  togglePin: (id: string) => void;
  setConfirmationStatus: (id: string, status: Visit['confirmationStatus']) => void;

  // Week actions
  startNewWeek: (weekId: string, startDate: string, patients: { patientId: string; requiredVisits: number }[]) => void;
  setCurrentWeek: (weekId: string | null) => void;

  // Navigation
  setView: (view: View) => void;
  setSelectedDate: (date: string | null) => void;

  // Time blocks
  addTimeBlock: (block: TimeBlock) => void;
  removeTimeBlock: (id: string) => void;

  // Settings
  updateSettings: (updates: Partial<AppSettings>) => void;

  // Sessions
  startSchedulingSession: () => void;
  endSchedulingSession: () => void;

  // Suggestions
  refreshSuggestions: () => void;
  dismissSuggestion: (id: string) => void;

  // Seed
  seedIfEmpty: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      patients: [],
      weeks: [],
      visits: [],
      timeBlocks: [],
      settings: defaultSettings,
      sessions: [],
      currentWeekId: null,
      currentView: 'week',
      selectedDate: null,
      schedulingStartTime: null,
      suggestions: [],

      addPatient: (patient) =>
        set((state) => ({ patients: [...state.patients, patient] })),

      updatePatient: (id, updates) =>
        set((state) => ({
          patients: state.patients.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        })),

      archivePatient: (id) =>
        set((state) => ({
          patients: state.patients.map((p) => (p.id === id ? { ...p, archived: true } : p)),
        })),

      addVisit: (visit) =>
        set((state) => {
          const newVisits = [...state.visits, visit];
          const currentWeek = state.weeks.find((w) => w.id === visit.weekId);
          const newSuggestions = currentWeek
            ? generateSuggestions(currentWeek, newVisits, state.patients)
            : state.suggestions;
          return { visits: newVisits, suggestions: newSuggestions };
        }),

      updateVisit: (id, updates) =>
        set((state) => {
          const newVisits = state.visits.map((v) => (v.id === id ? { ...v, ...updates } : v));
          const visit = newVisits.find((v) => v.id === id);
          const currentWeek = visit ? state.weeks.find((w) => w.id === visit.weekId) : null;
          const newSuggestions = currentWeek
            ? generateSuggestions(currentWeek, newVisits, state.patients)
            : state.suggestions;
          return { visits: newVisits, suggestions: newSuggestions };
        }),

      cancelVisit: (id) =>
        set((state) => {
          const newVisits = state.visits.map((v) =>
            v.id === id ? { ...v, status: 'CANCELLED' as const } : v
          );
          const visit = newVisits.find((v) => v.id === id);
          const currentWeek = visit ? state.weeks.find((w) => w.id === visit.weekId) : null;
          const newSuggestions = currentWeek
            ? generateSuggestions(currentWeek, newVisits, state.patients)
            : state.suggestions;
          return { visits: newVisits, suggestions: newSuggestions };
        }),

      completeVisit: (id) =>
        set((state) => ({
          visits: state.visits.map((v) =>
            v.id === id ? { ...v, status: 'COMPLETED' as const } : v
          ),
        })),

      togglePin: (id) =>
        set((state) => ({
          visits: state.visits.map((v) => (v.id === id ? { ...v, pinned: !v.pinned } : v)),
        })),

      setConfirmationStatus: (id, status) =>
        set((state) => ({
          visits: state.visits.map((v) =>
            v.id === id ? { ...v, confirmationStatus: status } : v
          ),
        })),

      startNewWeek: (weekId, startDate, patients) =>
        set((state) => {
          const newWeek: Week = { id: weekId, startDate, patients };
          return {
            weeks: [...state.weeks, newWeek],
            currentWeekId: weekId,
            currentView: 'week',
          };
        }),

      setCurrentWeek: (weekId) => set({ currentWeekId: weekId }),

      setView: (view) => set({ currentView: view }),

      setSelectedDate: (date) => set({ selectedDate: date }),

      addTimeBlock: (block) =>
        set((state) => ({ timeBlocks: [...state.timeBlocks, block] })),

      removeTimeBlock: (id) =>
        set((state) => ({
          timeBlocks: state.timeBlocks.filter((b) => b.id !== id),
        })),

      updateSettings: (updates) =>
        set((state) => ({ settings: { ...state.settings, ...updates } })),

      startSchedulingSession: () => {
        const { schedulingStartTime } = get();
        if (!schedulingStartTime) {
          set({ schedulingStartTime: Date.now() });
        }
      },

      endSchedulingSession: () => {
        const { schedulingStartTime, sessions } = get();
        if (schedulingStartTime) {
          const activeSeconds = Math.round((Date.now() - schedulingStartTime) / 1000);
          const session: SchedulingSession = {
            id: Math.random().toString(36).slice(2, 10),
            date: new Date().toISOString().slice(0, 10),
            activeSeconds,
          };
          set({ schedulingStartTime: null, sessions: [...sessions, session] });
        }
      },

      refreshSuggestions: () => {
        const { currentWeekId, weeks, visits, patients } = get();
        const week = weeks.find((w) => w.id === currentWeekId);
        if (week) {
          set({ suggestions: generateSuggestions(week, visits, patients) });
        }
      },

      dismissSuggestion: (id) =>
        set((state) => ({
          suggestions: state.suggestions.filter((s) => s.id !== id),
        })),

      seedIfEmpty: () => {
        const { patients } = get();
        if (patients.length === 0) {
          const { patients: seedPatients, weeks, visits } = seedData();
          set({
            patients: seedPatients,
            weeks,
            visits,
            currentWeekId: weeks[0]?.id ?? null,
          });
        }
      },
    }),
    {
      name: 'hh-scheduler-v1',
    }
  )
);
