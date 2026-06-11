import { useState } from 'react';
import { useStore } from '../store';
import { format, startOfWeek, addDays } from 'date-fns';
import { Patient } from '../types';

interface PatientRow {
  patient: Patient;
  included: boolean;
  visits: number;
}

export default function NewWeekSetup() {
  const { patients, weeks, startNewWeek, setView } = useStore();

  // Figure out the next week start
  const today = new Date();
  const monday = startOfWeek(today, { weekStartsOn: 1 });
  const weekStartDate = format(monday, 'yyyy-MM-dd');
  const lastWeek = weeks[weeks.length - 1];
  const alreadyExists = weeks.some((w) => w.startDate === weekStartDate);

  const [rows, setRows] = useState<PatientRow[]>(() => {
    const activePatients = patients.filter((p) => !p.archived);
    return activePatients.map((patient) => {
      // Find default visits from last week or use patient default
      const lastWeekPatient = lastWeek?.patients.find((wp) => wp.patientId === patient.id);
      return {
        patient,
        included: true,
        visits: lastWeekPatient?.requiredVisits ?? patient.defaultWeeklyVisits,
      };
    });
  });

  const updateRow = (patientId: string, updates: Partial<PatientRow>) => {
    setRows((prev) =>
      prev.map((r) => (r.patient.id === patientId ? { ...r, ...updates } : r))
    );
  };

  const handleStart = () => {
    const weekId = `week-${weekStartDate}`;
    const includedPatients = rows
      .filter((r) => r.included)
      .map((r) => ({ patientId: r.patient.id, requiredVisits: r.visits }));
    startNewWeek(weekId, weekStartDate, includedPatients);
  };

  if (alreadyExists) {
    return (
      <div className="flex flex-col items-center justify-center h-64 px-4 text-center">
        <span className="text-4xl mb-3">📅</span>
        <p className="text-base font-semibold text-gray-700">Week already set up</p>
        <p className="text-sm text-gray-500 mt-1">
          Week of {format(monday, 'MMM d')} is already active.
        </p>
        <button
          onClick={() => setView('week')}
          className="mt-4 bg-blue-600 text-white rounded-xl px-6 py-3 text-sm font-semibold"
        >
          Go to Week View
        </button>
      </div>
    );
  }

  const totalVisits = rows.filter((r) => r.included).reduce((sum, r) => sum + r.visits, 0);
  const includedCount = rows.filter((r) => r.included).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <h1 className="text-lg font-bold text-gray-800">Set Up New Week</h1>
        <div className="text-sm text-gray-500 mt-0.5">
          {format(monday, 'MMM d')} – {format(addDays(monday, 6), 'MMM d, yyyy')}
        </div>
        <div className="text-xs text-gray-400 mt-0.5">
          {includedCount} patients • {totalVisits} total visits
        </div>
      </div>

      {/* Patient Rows */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {rows.length === 0 ? (
          <div className="text-center text-gray-400 py-8 text-sm">
            No patients. Add patients first.
          </div>
        ) : (
          rows.map(({ patient, included, visits }) => (
            <div
              key={patient.id}
              className={`bg-white rounded-xl shadow-sm border p-3 transition-opacity ${
                included ? 'border-gray-100 opacity-100' : 'border-gray-50 opacity-50'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Toggle */}
                <button
                  onClick={() => updateRow(patient.id, { included: !included })}
                  className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 ${
                    included ? 'bg-blue-500' : 'bg-gray-200'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${
                      included ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>

                {/* Patient Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-800">{patient.name}</div>
                  <div className="text-xs text-gray-400 truncate">{patient.address}</div>
                </div>

                {/* Visit Count */}
                {included && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() =>
                        updateRow(patient.id, { visits: Math.max(1, visits - 1) })
                      }
                      className="w-8 h-8 bg-gray-100 rounded-lg text-gray-700 font-bold text-base flex items-center justify-center"
                    >
                      −
                    </button>
                    <span className="w-6 text-center font-bold text-gray-800">{visits}</span>
                    <button
                      onClick={() => updateRow(patient.id, { visits: visits + 1 })}
                      className="w-8 h-8 bg-gray-100 rounded-lg text-gray-700 font-bold text-base flex items-center justify-center"
                    >
                      +
                    </button>
                    <span className="text-xs text-gray-400 ml-0.5">visits</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Start Button */}
      <div className="px-4 py-4 bg-white border-t border-gray-200">
        <button
          onClick={handleStart}
          disabled={includedCount === 0}
          className={`w-full py-4 rounded-xl text-base font-bold transition-colors ${
            includedCount > 0
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Start Week ({totalVisits} visits)
        </button>
        {weeks.length > 0 && (
          <button
            onClick={() => setView('week')}
            className="w-full py-2.5 rounded-xl text-sm text-gray-500 mt-2"
          >
            Cancel — Stay on Current Week
          </button>
        )}
      </div>
    </div>
  );
}
