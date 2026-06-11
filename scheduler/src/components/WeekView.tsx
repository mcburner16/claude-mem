import { useState } from 'react';
import { useStore } from '../store';
import { getWeekDates, getVisitsForDay } from '../utils/scheduling';
import { format } from 'date-fns';
import MasterList from './MasterList';
import ScheduleModal from './ScheduleModal';
import StatsBar from './StatsBar';
import { Patient } from '../types';

const DAY_ABBREVS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function WeekView() {
  const { currentWeekId, weeks, visits, settings, setView, setSelectedDate, suggestions } =
    useStore();
  const [schedulingPatient, setSchedulingPatient] = useState<Patient | null>(null);

  const currentWeek = weeks.find((w) => w.id === currentWeekId);
  if (!currentWeek) {
    return (
      <div className="p-6 text-center text-gray-400">
        <p className="text-lg">No week selected.</p>
        <p className="text-sm mt-1">Tap "New Week" to get started.</p>
      </div>
    );
  }

  const weekDates = getWeekDates(currentWeek.startDate);

  const handleDayTap = (date: string) => {
    setSelectedDate(date);
    setView('day');
  };

  const handlePatientTap = (patient: Patient) => {
    setSchedulingPatient(patient);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Suggestion Banner */}
      {suggestions.length > 0 && (
        <div
          className="mx-3 mt-3 bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2 flex items-center justify-between cursor-pointer"
          onClick={() => setView('suggestions')}
        >
          <span className="text-sm text-yellow-700 font-medium">
            💡 {suggestions.length} scheduling suggestion{suggestions.length > 1 ? 's' : ''}
          </span>
          <span className="text-yellow-500 text-xs">View →</span>
        </div>
      )}

      {/* Master List */}
      <div className="flex-1 overflow-y-auto">
        <MasterList onPatientTap={handlePatientTap} />
      </div>

      {/* Week Strip */}
      <div className="bg-white border-t border-gray-200 px-3 pt-3 pb-2 flex-shrink-0">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
          This Week
        </div>
        <div className="grid grid-cols-7 gap-1">
          {weekDates.map((date, i) => {
            const dayOfWeek = i === 6 ? 0 : i + 1;
            const isWorkingDay = settings.workingDays.includes(dayOfWeek);
            const dayVisits = getVisitsForDay(date, visits).filter(
              (v) => v.weekId === currentWeekId && v.status !== 'CANCELLED'
            );
            const count = dayVisits.length;
            const completedCount = dayVisits.filter((v) => v.status === 'COMPLETED').length;
            const today = format(new Date(), 'yyyy-MM-dd');
            const isToday = date === today;

            return (
              <button
                key={date}
                onClick={() => isWorkingDay && handleDayTap(date)}
                disabled={!isWorkingDay}
                className={`flex flex-col items-center py-2 px-1 rounded-xl text-xs transition-colors ${
                  !isWorkingDay
                    ? 'opacity-30 cursor-not-allowed'
                    : isToday
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                }`}
              >
                <span className={`font-medium ${isToday ? 'text-blue-100' : 'text-gray-500'}`}>
                  {DAY_ABBREVS[i]}
                </span>
                <span className={`text-lg font-bold leading-none mt-0.5 ${isToday ? 'text-white' : ''}`}>
                  {count}
                </span>
                {count > 0 && (
                  <span className={`text-xs mt-0.5 ${isToday ? 'text-blue-200' : 'text-gray-400'}`}>
                    {completedCount}/{count}
                  </span>
                )}
                <div className="mt-1">
                  <StatsBar date={date} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Schedule Modal */}
      {schedulingPatient && (
        <ScheduleModal
          patient={schedulingPatient}
          onClose={() => setSchedulingPatient(null)}
        />
      )}
    </div>
  );
}
