import type { RequestStatus } from '../types';

interface Props {
  status: RequestStatus;
}

const colorMap: Record<RequestStatus, string> = {
  New: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  'Needs More Info': 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  'Ready for Review': 'bg-teal-500/20 text-teal-400 border border-teal-500/30',
  'Approved for Dispatch': 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  'Vendor Contacted': 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30',
  Scheduled: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
  Completed: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
};

export default function StatusBadge({ status }: Props) {
  return (
    <span className={`inline-flex items-center rounded-full text-xs font-medium px-2.5 py-0.5 ${colorMap[status]}`}>
      {status}
    </span>
  );
}
