import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRequests, updateRequestStatus } from '../store';
import UrgencyBadge from '../components/UrgencyBadge';
import StatusBadge from '../components/StatusBadge';
import type { MaintenanceRequest, RequestStatus } from '../types';

const STATUS_OPTIONS: RequestStatus[] = [
  'New', 'Needs More Info', 'Ready for Review', 'Approved for Dispatch',
  'Vendor Contacted', 'Scheduled', 'Completed',
];

function parseMinutes(s: string): number {
  const match = s.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

function DetailPanel({
  req,
  onClose,
  onStatusChange,
  onApprove,
}: {
  req: MaintenanceRequest;
  onClose: () => void;
  onStatusChange: (id: string, status: RequestStatus) => void;
  onApprove: (id: string) => void;
}) {
  const { triageResult: t } = req;

  return (
    <tr>
      <td colSpan={9} className="bg-surface2 border-b border-gray-700 p-0">
        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <h3 className="font-semibold text-textPrimary">
              {req.residentName} — Unit {req.unitNumber}, {req.propertyName}
            </h3>
            <button onClick={onClose} className="text-textSecondary hover:text-textPrimary text-lg leading-none">
              ✕
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-textSecondary font-semibold uppercase mb-1">AI Recommendation</p>
              <p className="text-sm text-textPrimary leading-relaxed">{t.aiRecommendation}</p>
            </div>
            <div>
              <p className="text-xs text-textSecondary font-semibold uppercase mb-1">Recommended Next Step</p>
              <p className="text-sm text-textPrimary leading-relaxed">{t.recommendedNextStep}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-textSecondary font-semibold uppercase mb-1">PMS Work Order</p>
              <p className="text-sm text-textPrimary leading-relaxed">{t.pmsWorkOrderSummary}</p>
            </div>
            <div>
              <p className="text-xs text-textSecondary font-semibold uppercase mb-1">Manager Alert</p>
              <p className="text-sm text-textPrimary leading-relaxed">{t.managerMobileAlert}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-700">
            <div className="flex items-center gap-2">
              <label className="text-sm text-textSecondary">Status:</label>
              <select
                value={req.status}
                onChange={(e) => onStatusChange(req.id, e.target.value as RequestStatus)}
                className="bg-surface border border-gray-600 text-textPrimary text-sm rounded px-2 py-1"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            {req.status !== 'Approved for Dispatch' && req.status !== 'Completed' && (
              <button
                onClick={() => onApprove(req.id)}
                className="bg-accent hover:bg-accentHover text-white text-sm font-medium px-4 py-1.5 rounded transition-colors"
              >
                Approve for Dispatch
              </button>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState(() => getRequests());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function handleStatusChange(id: string, status: RequestStatus) {
    updateRequestStatus(id, status);
    setRequests(getRequests());
  }

  function handleApprove(id: string) {
    handleStatusChange(id, 'Approved for Dispatch');
  }

  const emergency = requests.filter((r) => r.urgency === 'Emergency');
  const sameDay = requests.filter((r) => r.urgency === 'Same-Day');
  const routine = requests.filter((r) => r.urgency === 'Routine');
  const needsInfo = requests.filter((r) => r.urgency === 'Needs More Info');
  const totalMinutesSaved = requests.reduce(
    (sum, r) => sum + parseMinutes(r.triageResult.estimatedStaffTimeSaved),
    0
  );
  const hoursSaved = (totalMinutesSaved / 60).toFixed(1);

  const stats = [
    { label: 'Total Requests', value: requests.length, color: 'text-textPrimary' },
    { label: 'Emergencies', value: emergency.length, color: 'text-red-400' },
    { label: 'Same-Day', value: sameDay.length, color: 'text-orange-400' },
    { label: 'Routine', value: routine.length, color: 'text-green-400' },
    { label: 'Needs More Info', value: needsInfo.length, color: 'text-yellow-400' },
    { label: 'Est. Hours Saved', value: `${hoursSaved}h`, color: 'text-accent' },
  ];

  return (
    <div className="min-h-screen bg-bg py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-textPrimary">Manager Dashboard</h1>
            <p className="text-textSecondary text-sm mt-1">Review and approve triage results before any vendor is contacted.</p>
          </div>
          <button
            onClick={() => navigate('/intake')}
            className="bg-accent hover:bg-accentHover text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + New Request
          </button>
        </div>

        {/* Human Approval Banner */}
        <div className="bg-accent/10 border border-accent/40 rounded-xl px-5 py-4 mb-6 flex items-start gap-3">
          <span className="text-xl flex-shrink-0">🔒</span>
          <p className="text-textPrimary font-semibold text-sm">
            <strong>Human Approval Required</strong> — The system prepares the request. Your team reviews and approves next steps before any vendor is contacted.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {stats.map((s) => (
            <div key={s.label} className="bg-surface border border-gray-700 rounded-xl p-4 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-textSecondary mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-surface border border-gray-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  {['Resident', 'Property', 'Unit', 'Category', 'Urgency', 'Status', 'Vendor', 'Summary', 'Created'].map(
                    (h) => (
                      <th key={h} className="text-left text-xs font-semibold text-textSecondary uppercase tracking-wide px-4 py-3 whitespace-nowrap">
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <>
                    <tr
                      key={req.id}
                      onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                      className="border-b border-gray-700/50 hover:bg-surface2 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-textPrimary font-medium whitespace-nowrap">{req.residentName}</td>
                      <td className="px-4 py-3 text-textSecondary whitespace-nowrap">{req.propertyName}</td>
                      <td className="px-4 py-3 text-textSecondary">{req.unitNumber}</td>
                      <td className="px-4 py-3 text-textSecondary whitespace-nowrap">{req.category}</td>
                      <td className="px-4 py-3">
                        <UrgencyBadge urgency={req.urgency} size="sm" />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={req.status} />
                      </td>
                      <td className="px-4 py-3 text-textSecondary text-xs whitespace-nowrap">{req.triageResult.suggestedVendor}</td>
                      <td className="px-4 py-3 text-textSecondary max-w-xs truncate">
                        {req.description.substring(0, 60)}{req.description.length > 60 ? '…' : ''}
                      </td>
                      <td className="px-4 py-3 text-textSecondary text-xs whitespace-nowrap">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                    {expandedId === req.id && (
                      <DetailPanel
                        key={req.id + '-detail'}
                        req={req}
                        onClose={() => setExpandedId(null)}
                        onStatusChange={handleStatusChange}
                        onApprove={handleApprove}
                      />
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
