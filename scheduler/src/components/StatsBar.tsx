import { useStore } from '../store';
import { getVisitsForDay } from '../utils/scheduling';
import { totalRouteMiles, totalRouteDriveMinutes } from '../utils/haversine';

interface StatsBarProps {
  date: string;
}

export default function StatsBar({ date }: StatsBarProps) {
  const { visits, patients } = useStore();

  const dayVisits = getVisitsForDay(date, visits).filter((v) => v.status !== 'CANCELLED');
  const patientCount = dayVisits.length;
  const totalVisitMinutes = dayVisits.reduce((sum, v) => sum + v.estimatedDuration, 0);

  // Build route coords in visit order
  const coords = dayVisits
    .map((v) => patients.find((p) => p.id === v.patientId))
    .filter(Boolean)
    .map((p) => ({ lat: p!.lat, lng: p!.lng }));

  const driveMinutes = totalRouteDriveMinutes(coords);
  const miles = totalRouteMiles(coords);
  const totalHours = ((totalVisitMinutes + driveMinutes) / 60).toFixed(1);

  return (
    <div className="flex items-center gap-3 text-xs text-gray-500">
      <span className="flex items-center gap-1">
        <span>👤</span>
        <span className="font-medium text-gray-700">{patientCount}</span>
      </span>
      <span className="flex items-center gap-1">
        <span>⏱</span>
        <span className="font-medium text-gray-700">{totalHours}h</span>
      </span>
      <span className="flex items-center gap-1">
        <span>🚗</span>
        <span className="font-medium text-gray-700">{miles.toFixed(1)}mi</span>
      </span>
    </div>
  );
}
