import { useStore } from '../store';
import { getVisitsForDay } from '../utils/scheduling';

interface DriveMyDayProps {
  date: string;
  onClose: () => void;
}

export default function DriveMyDay({ date, onClose }: DriveMyDayProps) {
  const { visits, patients, currentWeekId } = useStore();

  const dayVisits = getVisitsForDay(date, visits).filter(
    (v) => v.weekId === currentWeekId && v.status !== 'CANCELLED'
  );

  const orderedPatients = dayVisits
    .map((v) => patients.find((p) => p.id === v.patientId))
    .filter(Boolean);

  const addresses = orderedPatients.map((p) => p!.address);

  const buildGoogleMapsUrl = () => {
    const base = 'https://www.google.com/maps/dir/';
    const origin = 'Current+Location';
    const stops = addresses.map((a) => encodeURIComponent(a)).join('/');
    return `${base}${origin}/${stops}`;
  };

  const buildWazeUrl = () => {
    const first = addresses[0];
    if (!first) return '#';
    return `https://waze.com/ul?q=${encodeURIComponent(first)}&navigate=yes`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {
      // Fallback
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-lg mx-auto rounded-t-2xl p-5 pb-8 shadow-xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">Drive My Day</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            ✕
          </button>
        </div>

        {orderedPatients.length === 0 ? (
          <p className="text-gray-400 text-center py-4">No visits scheduled for this day.</p>
        ) : (
          <>
            {/* Route Buttons */}
            <div className="flex gap-2 mb-5">
              <a
                href={buildGoogleMapsUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-blue-600 text-white rounded-xl py-3 text-sm font-semibold text-center"
              >
                🗺 Google Maps Route
              </a>
              <a
                href={buildWazeUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-indigo-500 text-white rounded-xl py-3 text-sm font-semibold text-center"
              >
                🚗 Waze
              </a>
            </div>

            {/* Address List */}
            <div className="mb-4">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Stop Order (Apple Maps — copy in reverse)
              </div>
              <div className="space-y-2">
                {orderedPatients.map((patient, i) => (
                  <div
                    key={patient!.id}
                    className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5"
                  >
                    <span className="w-6 h-6 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center font-bold flex-shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-800">{patient!.name}</div>
                      <div className="text-xs text-gray-500 truncate">{patient!.address}</div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(patient!.address)}
                      className="text-xs text-blue-600 bg-blue-50 rounded-lg px-2 py-1 flex-shrink-0 hover:bg-blue-100"
                    >
                      Copy
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Apple Maps note */}
            <p className="text-xs text-gray-400 text-center">
              For Apple Maps: enter stops in reverse order (last stop first)
            </p>
          </>
        )}
      </div>
    </div>
  );
}
