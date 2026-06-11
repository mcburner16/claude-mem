import { useStore } from '../store';
import { Patient } from '../types';
import { getRemainingVisits } from '../utils/scheduling';

interface MasterListProps {
  onPatientTap: (patient: Patient) => void;
}

export default function MasterList({ onPatientTap }: MasterListProps) {
  const { patients, visits, weeks, currentWeekId } = useStore();

  const currentWeek = weeks.find((w) => w.id === currentWeekId);
  if (!currentWeek) return null;

  const activePatients = patients.filter((p) => !p.archived);
  const patientsWithRemaining = activePatients
    .map((p) => ({
      patient: p,
      remaining: getRemainingVisits(currentWeekId!, p.id, visits, currentWeek),
    }))
    .filter((x) => x.remaining > 0)
    .sort((a, b) => b.remaining - a.remaining);

  if (patientsWithRemaining.length === 0) {
    return (
      <div className="p-4 text-center text-gray-400 text-sm">
        All visits scheduled for this week!
      </div>
    );
  }

  const contactBadge = (pref: string) => {
    if (pref === 'TEXT') return <span title="Text" className="text-gray-500">💬</span>;
    if (pref === 'CALL') return <span title="Call" className="text-gray-500">📞</span>;
    return (
      <span title="Call & Text" className="text-gray-500">
        📞💬
      </span>
    );
  };

  return (
    <div className="px-3 py-2 space-y-2">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
        Still Needs Visits ({patientsWithRemaining.length})
      </div>
      {patientsWithRemaining.map(({ patient, remaining }) => (
        <button
          key={patient.id}
          onClick={() => onPatientTap(patient)}
          className="w-full bg-white rounded-xl shadow-sm p-3 flex items-center gap-3 text-left active:bg-gray-50 border border-gray-100"
        >
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-800 text-sm truncate">{patient.name}</div>
            <div className="text-xs text-gray-400 truncate mt-0.5">{patient.address}</div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className={`text-xs font-bold px-2 py-1 rounded-full ${
                remaining > 2
                  ? 'bg-red-100 text-red-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              ×{remaining}
            </span>
            <span
              className={`text-xs px-2 py-1 rounded-full font-medium ${
                patient.amPmPreference === 'AM'
                  ? 'bg-amber-100 text-amber-700'
                  : patient.amPmPreference === 'PM'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {patient.amPmPreference}
            </span>
            {contactBadge(patient.contactPreference)}
          </div>
        </button>
      ))}
    </div>
  );
}
