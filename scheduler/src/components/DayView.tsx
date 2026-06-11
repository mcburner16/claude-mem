import React, { useState } from 'react';
import { useStore } from '../store';
import { format, parseISO } from 'date-fns';
import { getVisitsForDay } from '../utils/scheduling';
import StatsBar from './StatsBar';
import DriveMyDay from './DriveMyDay';
import { Visit } from '../types';

interface ActionSheetProps {
  visit: Visit;
  patientName: string;
  onClose: () => void;
}

function ActionSheet({ visit, patientName, onClose }: ActionSheetProps) {
  const { updateVisit, cancelVisit, completeVisit, togglePin, weeks, currentWeekId, patients } = useStore();
  const [moveMode, setMoveMode] = useState(false);
  const patient = patients.find((p) => p.id === visit.patientId);
  const effectivePoints = visit.pointValueOverride ?? patient?.pointValue ?? 1.0;

  const weekDates = (() => {
    const week = weeks.find((w) => w.id === currentWeekId);
    if (!week) return [];
    const mon = parseISO(week.startDate);
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      return format(d, 'yyyy-MM-dd');
    });
  })();

  const handleMove = (newDate: string) => {
    updateVisit(visit.id, { date: newDate });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-lg mx-auto rounded-t-2xl p-5 pb-8 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-gray-800">{patientName}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {visit.timeBlock} block • {visit.estimatedDuration} min
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 p-1">✕</button>
        </div>

        {moveMode ? (
          <div>
            <div className="text-sm font-semibold text-gray-600 mb-3">Move to which day?</div>
            <div className="grid grid-cols-5 gap-2">
              {weekDates.map((date) => (
                <button
                  key={date}
                  onClick={() => handleMove(date)}
                  disabled={date === visit.date}
                  className={`py-2 rounded-xl text-xs font-semibold ${
                    date === visit.date
                      ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  {format(parseISO(date), 'EEE')}
                  <br />
                  {format(parseISO(date), 'd')}
                </button>
              ))}
            </div>
            <button
              onClick={() => setMoveMode(false)}
              className="mt-3 w-full text-gray-500 text-sm py-2"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {!visit.pinned && (
              <button
                onClick={() => setMoveMode(true)}
                className="w-full bg-gray-100 text-gray-700 rounded-xl py-3 text-sm font-semibold hover:bg-gray-200"
              >
                ↕ Move Visit
              </button>
            )}
            <button
              onClick={() => {
                completeVisit(visit.id);
                onClose();
              }}
              disabled={visit.status === 'COMPLETED'}
              className={`w-full rounded-xl py-3 text-sm font-semibold ${
                visit.status === 'COMPLETED'
                  ? 'bg-green-50 text-green-300 cursor-not-allowed'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              ✓ Mark Complete
            </button>
            <button
              onClick={() => {
                togglePin(visit.id);
                onClose();
              }}
              className="w-full bg-yellow-100 text-yellow-700 rounded-xl py-3 text-sm font-semibold hover:bg-yellow-200"
            >
              {visit.pinned ? '🔓 Unpin' : '📌 Pin Visit'}
            </button>
            <button
              onClick={() => {
                const patient = useStore
                  .getState()
                  .patients.find((p) => p.id === visit.patientId);
                if (patient) {
                  window.open(
                    `https://www.google.com/maps/dir/Current+Location/${encodeURIComponent(patient.address)}`,
                    '_blank'
                  );
                }
                onClose();
              }}
              className="w-full bg-blue-100 text-blue-700 rounded-xl py-3 text-sm font-semibold hover:bg-blue-200"
            >
              🗺 Navigate (Single Stop)
            </button>
            {/* Point Value Override */}
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Visit Type · <span className="text-blue-600 normal-case">{effectivePoints} pt{effectivePoints !== 1 ? 's' : ''}</span>
                {visit.pointValueOverride !== undefined && (
                  <button
                    onClick={() => updateVisit(visit.id, { pointValueOverride: undefined })}
                    className="ml-2 text-gray-400 hover:text-gray-600 text-xs normal-case font-normal"
                  >
                    reset to default
                  </button>
                )}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {([0.5, 1.0, 1.5, 2.0] as const).map((val) => (
                  <button
                    key={val}
                    onClick={() => updateVisit(visit.id, {
                      pointValueOverride: val === patient?.pointValue ? undefined : val,
                    })}
                    className={`py-2 rounded-xl text-xs font-semibold transition-colors ${
                      effectivePoints === val
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <div>{val}pt</div>
                    <div className="text-xs opacity-70">
                      {val === 0.5 ? 'Short' : val === 1.0 ? 'Routine' : val === 1.5 ? 'Long' : 'Eval'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => {
                cancelVisit(visit.id);
                onClose();
              }}
              className="w-full bg-red-100 text-red-700 rounded-xl py-3 text-sm font-semibold hover:bg-red-200"
            >
              ✕ Cancel Visit
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DayView() {
  const { selectedDate, visits, patients, currentWeekId, startSchedulingSession, setView } = useStore();
  const [showDriveMyDay, setShowDriveMyDay] = useState(false);
  const [actionVisit, setActionVisit] = useState<Visit | null>(null);

  const date = selectedDate || format(new Date(), 'yyyy-MM-dd');

  React.useEffect(() => {
    startSchedulingSession();
  }, []);

  const dayVisits = getVisitsForDay(date, visits).filter(
    (v) => v.weekId === currentWeekId
  );
  const amVisits = dayVisits.filter((v) => v.timeBlock === 'AM');
  const pmVisits = dayVisits.filter((v) => v.timeBlock === 'PM');

  const getPatient = (patientId: string) => patients.find((p) => p.id === patientId);

  const statusColors: Record<string, string> = {
    SCHEDULED: 'bg-blue-100 text-blue-700',
    COMPLETED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-gray-100 text-gray-400',
  };

  const confirmColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-600',
    SENT: 'bg-orange-100 text-orange-600',
    CONFIRMED: 'bg-green-100 text-green-600',
  };

  const renderVisitCard = (visit: Visit) => {
    const patient = getPatient(visit.patientId);
    if (!patient) return null;

    return (
      <button
        key={visit.id}
        onClick={() => setActionVisit(visit)}
        className={`w-full bg-white rounded-xl shadow-sm p-3 text-left border border-gray-100 active:bg-gray-50 ${
          visit.status === 'CANCELLED' ? 'opacity-50' : ''
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-800 text-sm">{patient.name}</span>
              {visit.pinned && <span title="Pinned">🔒</span>}
            </div>
            <div className="text-xs text-gray-500 mt-0.5 truncate">{patient.address}</div>
            <div className="flex items-center gap-2 mt-1.5">
              {visit.specificTime && (
                <span className="text-xs text-gray-600 font-medium">{visit.specificTime}</span>
              )}
              <span className="text-xs text-gray-400">{visit.estimatedDuration} min</span>
              {patient.contactPreference === 'TEXT' && <span className="text-gray-400">💬</span>}
              {patient.contactPreference === 'CALL' && <span className="text-gray-400">📞</span>}
              {patient.contactPreference === 'BOTH' && <span className="text-gray-400">📞💬</span>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 ml-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[visit.status]}`}>
              {visit.status}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${confirmColors[visit.confirmationStatus]}`}>
              {visit.confirmationStatus}
            </span>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => setView('week')}
              className="text-xs text-blue-600 mb-1"
            >
              ← Week View
            </button>
            <div className="text-lg font-bold text-gray-800">
              {format(parseISO(date), 'EEEE, MMMM d')}
            </div>
            <div className="mt-1">
              <StatsBar date={date} showPoints />
            </div>
          </div>
          <button
            onClick={() => setShowDriveMyDay(true)}
            className="bg-blue-600 text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-md"
          >
            🗺 Drive My Day
          </button>
        </div>
      </div>

      {/* Visit Blocks */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {/* AM Block */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-bold text-amber-600 uppercase tracking-wide">AM</span>
            <span className="text-xs text-gray-400">{amVisits.length} visit{amVisits.length !== 1 ? 's' : ''}</span>
          </div>
          {amVisits.length === 0 ? (
            <div className="text-xs text-gray-300 italic pl-1">No AM visits</div>
          ) : (
            <div className="space-y-2">{amVisits.map(renderVisitCard)}</div>
          )}
        </div>

        {/* PM Block */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-bold text-indigo-600 uppercase tracking-wide">PM</span>
            <span className="text-xs text-gray-400">{pmVisits.length} visit{pmVisits.length !== 1 ? 's' : ''}</span>
          </div>
          {pmVisits.length === 0 ? (
            <div className="text-xs text-gray-300 italic pl-1">No PM visits</div>
          ) : (
            <div className="space-y-2">{pmVisits.map(renderVisitCard)}</div>
          )}
        </div>
      </div>

      {/* Action Sheet */}
      {actionVisit && (
        <ActionSheet
          visit={actionVisit}
          patientName={getPatient(actionVisit.patientId)?.name ?? 'Unknown'}
          onClose={() => setActionVisit(null)}
        />
      )}

      {/* Drive My Day Modal */}
      {showDriveMyDay && (
        <DriveMyDay date={date} onClose={() => setShowDriveMyDay(false)} />
      )}
    </div>
  );
}
