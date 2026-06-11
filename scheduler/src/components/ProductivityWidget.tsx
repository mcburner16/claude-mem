import { useStore } from '../store';
import { format } from 'date-fns';

function getVisitPoints(visit: { pointValueOverride?: number }, patientPointValue: number): number {
  return visit.pointValueOverride ?? patientPointValue;
}

export default function ProductivityWidget() {
  const { currentWeekId, visits, patients, settings } = useStore();
  const { weeklyProductivityTarget } = settings;

  const today = format(new Date(), 'yyyy-MM-dd');

  const weekVisits = visits.filter(
    (v) => v.weekId === currentWeekId && v.status !== 'CANCELLED'
  );

  const todayVisits = weekVisits.filter((v) => v.date === today);

  const weekPoints = weekVisits.reduce((sum, v) => {
    const patient = patients.find((p) => p.id === v.patientId);
    return sum + getVisitPoints(v, patient?.pointValue ?? 1.0);
  }, 0);

  const todayPoints = todayVisits.reduce((sum, v) => {
    const patient = patients.find((p) => p.id === v.patientId);
    return sum + getVisitPoints(v, patient?.pointValue ?? 1.0);
  }, 0);

  const remaining = Math.max(0, weeklyProductivityTarget - weekPoints);
  const pct = weeklyProductivityTarget > 0
    ? Math.min(100, (weekPoints / weeklyProductivityTarget) * 100)
    : 0;

  const barColor =
    pct >= 100 ? 'bg-green-500' :
    pct >= 75  ? 'bg-yellow-400' :
                 'bg-blue-500';

  const textColor =
    pct >= 100 ? 'text-green-700' :
    pct >= 75  ? 'text-yellow-700' :
                 'text-blue-700';

  return (
    <div className="mx-3 mt-3 bg-white rounded-xl shadow-sm border border-gray-100 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Productivity</span>
        <span className={`text-xs font-bold ${textColor}`}>
          {weekPoints.toFixed(1)} / {weeklyProductivityTarget} pts
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-2.5 mb-2">
        <div
          className={`h-2.5 rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          Today: <span className="font-semibold text-gray-700">{todayPoints.toFixed(1)} pts</span>
          {' · '}
          {todayVisits.length} visit{todayVisits.length !== 1 ? 's' : ''}
        </span>
        {remaining > 0 ? (
          <span className="font-medium text-gray-600">{remaining.toFixed(1)} pts left</span>
        ) : (
          <span className="font-semibold text-green-600">Target met!</span>
        )}
      </div>
    </div>
  );
}
