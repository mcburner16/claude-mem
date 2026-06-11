import { useState } from 'react';
import { useStore } from '../store';
import { Patient } from '../types';
import { getWeekDates, getVisitsForDay, isSlotValid } from '../utils/scheduling';
import { format, parseISO } from 'date-fns';

interface ScheduleModalProps {
  patient: Patient;
  onClose: () => void;
}

const DAY_ABBREVS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ScheduleModal({ patient, onClose }: ScheduleModalProps) {
  const { currentWeekId, weeks, visits, settings, addVisit, startSchedulingSession } = useStore();

  const currentWeek = weeks.find((w) => w.id === currentWeekId);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<'AM' | 'PM'>(
    patient.amPmPreference !== 'EITHER' ? patient.amPmPreference : 'AM'
  );
  const [specificTime, setSpecificTime] = useState('');

  if (!currentWeek) return null;

  const weekDates = getWeekDates(currentWeek.startDate);

  const getVisitCountForDay = (date: string) =>
    getVisitsForDay(date, visits).filter(
      (v) => v.weekId === currentWeekId && v.status !== 'CANCELLED'
    ).length;

  // Find best slot = day with lowest load among valid working days
  const workingDayDates = weekDates.filter((_, i) =>
    settings.workingDays.includes(i === 6 ? 0 : i + 1)
  );
  const bestDate = workingDayDates.reduce(
    (best, date) => {
      const count = getVisitCountForDay(date);
      return count < best.count ? { date, count } : best;
    },
    { date: workingDayDates[0] || '', count: Infinity }
  ).date;

  const handleSchedule = () => {
    if (!selectedDate || !currentWeekId) return;
    startSchedulingSession();

    const newVisit = {
      id: Math.random().toString(36).slice(2, 10),
      weekId: currentWeekId,
      patientId: patient.id,
      date: selectedDate,
      timeBlock: selectedBlock,
      specificTime: specificTime || undefined,
      estimatedDuration: patient.defaultVisitDuration,
      status: 'SCHEDULED' as const,
      pinned: false,
      confirmationStatus: 'PENDING' as const,
    };
    addVisit(newVisit);
    onClose();
  };

  const amEnabled = isSlotValid(patient, 'AM');
  const pmEnabled = isSlotValid(patient, 'PM');

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-lg mx-auto rounded-t-2xl p-5 pb-8 shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800">{patient.name}</h2>
            <div className="text-sm text-gray-500 mt-0.5">{patient.address}</div>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  patient.amPmPreference === 'AM'
                    ? 'bg-amber-100 text-amber-700'
                    : patient.amPmPreference === 'PM'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {patient.amPmPreference} preferred
              </span>
              <span className="text-xs text-gray-400">{patient.defaultVisitDuration} min</span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            ✕
          </button>
        </div>

        {/* Week Grid */}
        <div className="mb-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Select Day
          </div>
          <div className="grid grid-cols-7 gap-1">
            {weekDates.map((date, i) => {
              const dayOfWeek = i === 6 ? 0 : i + 1; // Convert to 0=Sun..6=Sat
              const isWorkingDay = settings.workingDays.includes(dayOfWeek);
              const count = getVisitCountForDay(date);
              const isBest = date === bestDate;
              const isSelected = date === selectedDate;

              return (
                <button
                  key={date}
                  disabled={!isWorkingDay}
                  onClick={() => setSelectedDate(date)}
                  className={`flex flex-col items-center py-2 rounded-xl text-xs font-medium transition-colors ${
                    !isWorkingDay
                      ? 'opacity-30 cursor-not-allowed bg-gray-50'
                      : isSelected
                      ? 'bg-blue-600 text-white shadow-md'
                      : isBest
                      ? 'bg-green-100 text-green-700 border border-green-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span>{DAY_ABBREVS[i]}</span>
                  <span
                    className={`text-lg font-bold leading-none mt-0.5 ${
                      isSelected ? 'text-white' : ''
                    }`}
                  >
                    {count}
                  </span>
                  {isBest && !isSelected && (
                    <span className="text-xs text-green-600">★</span>
                  )}
                </button>
              );
            })}
          </div>
          {bestDate && (
            <div className="text-xs text-green-600 mt-1 px-1">
              ★ = lightest day
            </div>
          )}
        </div>

        {/* Time Block */}
        {selectedDate && (
          <div className="mb-4">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Time Block
            </div>
            <div className="flex gap-2">
              <button
                disabled={!amEnabled}
                onClick={() => setSelectedBlock('AM')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  !amEnabled
                    ? 'opacity-30 cursor-not-allowed bg-gray-100 text-gray-400'
                    : selectedBlock === 'AM'
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                }`}
              >
                AM ({settings.amWindowStart}–{settings.amWindowEnd})
              </button>
              <button
                disabled={!pmEnabled}
                onClick={() => setSelectedBlock('PM')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  !pmEnabled
                    ? 'opacity-30 cursor-not-allowed bg-gray-100 text-gray-400'
                    : selectedBlock === 'PM'
                    ? 'bg-indigo-500 text-white shadow-md'
                    : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                }`}
              >
                PM ({settings.pmWindowStart}–{settings.pmWindowEnd})
              </button>
            </div>
          </div>
        )}

        {/* Optional Specific Time */}
        {selectedDate && (
          <div className="mb-5">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Specific Time (optional)
            </div>
            <input
              type="time"
              value={specificTime}
              onChange={(e) => setSpecificTime(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
        )}

        {/* Confirm Button */}
        <button
          disabled={!selectedDate}
          onClick={handleSchedule}
          className={`w-full py-3.5 rounded-xl text-sm font-bold transition-colors ${
            selectedDate
              ? 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {selectedDate
            ? `Schedule for ${format(parseISO(selectedDate), 'EEEE MMM d')} ${selectedBlock}`
            : 'Select a day to schedule'}
        </button>
      </div>
    </div>
  );
}
