import { addDays, parseISO, format } from 'date-fns';
import { Visit, Week, Patient, Suggestion } from '../types';
import { distanceMiles } from './haversine';

export function getWeekDates(startDate: string): string[] {
  const monday = parseISO(startDate);
  return Array.from({ length: 7 }, (_, i) => format(addDays(monday, i), 'yyyy-MM-dd'));
}

export function getRemainingVisits(
  weekId: string,
  patientId: string,
  visits: Visit[],
  week: Week
): number {
  const weekPatient = week.patients.find((wp) => wp.patientId === patientId);
  if (!weekPatient) return 0;
  const scheduledCount = visits.filter(
    (v) =>
      v.weekId === weekId &&
      v.patientId === patientId &&
      v.status !== 'CANCELLED'
  ).length;
  return Math.max(0, weekPatient.requiredVisits - scheduledCount);
}

export function getVisitsForDay(date: string, visits: Visit[]): Visit[] {
  return visits.filter((v) => v.date === date);
}

export function isSlotValid(patient: Patient, timeBlock: 'AM' | 'PM'): boolean {
  if (patient.amPmPreference === 'EITHER') return true;
  return patient.amPmPreference === timeBlock;
}

export function generateSuggestions(
  week: Week,
  visits: Visit[],
  patients: Patient[]
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const weekVisits = visits.filter(
    (v) => v.weekId === week.id && v.status !== 'CANCELLED'
  );

  // Get dates from Mon-Fri
  const { startDate } = week;
  const monday = parseISO(startDate);
  const weekDates = Array.from({ length: 5 }, (_, i) =>
    format(addDays(monday, i), 'yyyy-MM-dd')
  );

  // --- 1. Balance suggestion: days with load > average + 2 ---
  const countByDay: Record<string, number> = {};
  for (const date of weekDates) {
    countByDay[date] = weekVisits.filter((v) => v.date === date).length;
  }
  const avgCount =
    Object.values(countByDay).reduce((a, b) => a + b, 0) / weekDates.length;

  for (const date of weekDates) {
    if (countByDay[date] > avgCount + 2) {
      const heavyVisits = weekVisits.filter(
        (v) => v.date === date && !v.pinned
      );
      const lightDays = weekDates.filter((d) => countByDay[d] < avgCount - 1);
      if (heavyVisits.length > 0 && lightDays.length > 0) {
        const targetDate = lightDays[0];
        suggestions.push({
          id: `balance-${date}`,
          type: 'balance',
          message: `${format(parseISO(date), 'EEE MMM d')} has ${countByDay[date]} visits (avg ${Math.round(avgCount)}). Move a visit to ${format(parseISO(targetDate), 'EEE MMM d')} to balance your week.`,
          visitIds: [heavyVisits[0].id],
          targetDate,
          targetTimeBlock: heavyVisits[0].timeBlock,
          estimatedSavingMinutes: 20,
        });
      }
    }
  }

  // --- 2. Swap suggestion: EITHER patients whose block differs from majority ---
  const patientBlockCounts: Record<string, { AM: number; PM: number }> = {};
  for (const v of weekVisits) {
    if (!patientBlockCounts[v.patientId]) {
      patientBlockCounts[v.patientId] = { AM: 0, PM: 0 };
    }
    patientBlockCounts[v.patientId][v.timeBlock]++;
  }

  for (const [patientId, counts] of Object.entries(patientBlockCounts)) {
    const patient = patients.find((p) => p.id === patientId);
    if (!patient || patient.amPmPreference !== 'EITHER') continue;
    const { AM, PM } = counts;
    if (AM + PM < 2) continue;
    const majority: 'AM' | 'PM' = AM >= PM ? 'AM' : 'PM';
    const minority: 'AM' | 'PM' = majority === 'AM' ? 'PM' : 'AM';
    const minorVisits = weekVisits.filter(
      (v) => v.patientId === patientId && v.timeBlock === minority && !v.pinned
    );
    if (minorVisits.length > 0) {
      suggestions.push({
        id: `swap-${patientId}`,
        type: 'swap',
        message: `${patient.name} has most visits in the ${majority} block. Switch ${minorVisits.length} visit(s) to ${majority} for consistency.`,
        visitIds: minorVisits.map((v) => v.id),
        targetTimeBlock: majority,
        estimatedSavingMinutes: 10,
      });
    }
  }

  // --- 3. Cluster suggestion: 3+ patients in same block/day within 5 miles ---
  for (const date of weekDates) {
    for (const block of ['AM', 'PM'] as const) {
      const blockVisits = weekVisits.filter(
        (v) => v.date === date && v.timeBlock === block
      );
      if (blockVisits.length < 3) continue;

      // Check if any 3+ patients are within 5 miles of each other
      const patientsInBlock = blockVisits
        .map((v) => patients.find((p) => p.id === v.patientId))
        .filter(Boolean) as Patient[];

      let clusterFound = false;
      for (let i = 0; i < patientsInBlock.length && !clusterFound; i++) {
        const nearby = patientsInBlock.filter(
          (p, j) =>
            j !== i &&
            distanceMiles(
              patientsInBlock[i].lat,
              patientsInBlock[i].lng,
              p.lat,
              p.lng
            ) <= 5
        );
        if (nearby.length >= 2) {
          const cluster = [patientsInBlock[i], ...nearby.slice(0, 2)];
          suggestions.push({
            id: `cluster-${date}-${block}`,
            type: 'cluster',
            message: `${cluster.map((p) => p.name.split(' ')[0]).join(', ')} are all within 5 miles on ${format(parseISO(date), 'EEE')} ${block}. Route them together to save drive time.`,
            visitIds: blockVisits
              .filter((v) => cluster.some((p) => p.id === v.patientId))
              .map((v) => v.id),
            estimatedSavingMinutes: 15,
          });
          clusterFound = true;
        }
      }
    }
  }

  return suggestions;
}
