import type { UrgencyLevel } from '../types';

interface Props {
  urgency: UrgencyLevel;
  size?: 'sm' | 'md' | 'lg';
}

const colorMap: Record<UrgencyLevel, string> = {
  Emergency: 'bg-red-500/20 text-red-400 border border-red-500/30',
  'Same-Day': 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  Routine: 'bg-green-500/20 text-green-400 border border-green-500/30',
  'Needs More Info': 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
};

const sizeMap = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-1.5 font-semibold',
};

export default function UrgencyBadge({ urgency, size = 'md' }: Props) {
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${colorMap[urgency]} ${sizeMap[size]}`}>
      {urgency}
    </span>
  );
}
