import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRequests } from '../store';
import UrgencyBadge from '../components/UrgencyBadge';
import { useToast } from '../components/Toast';

function CopyBox({ label, content }: { label: string; content: string }) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      showToast('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    });
  }


  return (
    <div className="bg-surface2 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-textSecondary uppercase tracking-wide">{label}</span>
        <button
          onClick={handleCopy}
          className="text-xs px-2.5 py-1 rounded border border-gray-600 text-textSecondary hover:text-accent hover:border-accent transition-colors"
        >
          {copied ? '✓ Copied!' : 'Copy'}
        </button>
      </div>
      <p className="text-sm text-textPrimary leading-relaxed whitespace-pre-wrap">{content}</p>
    </div>
  );
}

export default function TriageResultPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const requests = getRequests();
  const req = requests.find((r) => r.id === id);

  if (!req) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-textSecondary mb-4">Request not found.</p>
          <button onClick={() => navigate('/intake')} className="text-accent hover:underline">
            Submit a new request
          </button>
        </div>
      </div>
    );
  }

  const { triageResult: t } = req;

  return (
    <div className="min-h-screen bg-bg py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <UrgencyBadge urgency={req.urgency} size="lg" />
              <span className="text-sm text-textSecondary bg-surface2 border border-gray-700 px-3 py-1 rounded-full">
                {req.category}
              </span>
              <span className="text-sm text-textSecondary bg-surface2 border border-gray-700 px-3 py-1 rounded-full">
                Vendor: {t.suggestedVendor}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-textPrimary">
              {req.residentName} — Unit {req.unitNumber}, {req.propertyName}
            </h1>
            <p className="text-textSecondary text-sm mt-1">
              Submitted {new Date(req.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Human Approval Banner */}
        <div className="bg-accent/10 border border-accent/40 rounded-xl px-5 py-4 mb-6 flex items-start gap-3">
          <span className="text-xl flex-shrink-0 mt-0.5">🔒</span>
          <p className="text-textPrimary font-semibold text-sm md:text-base">
            <strong>Human Approval Required</strong> — The system prepares the request. Your team reviews and approves next steps before any vendor is contacted.
          </p>
        </div>

        {/* Main two-column layout */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Left: AI details */}
          <div className="space-y-4">
            <div className="bg-surface border border-gray-700 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-textSecondary uppercase tracking-wide mb-3">AI Recommendation</h2>
              <p className="text-sm text-textPrimary leading-relaxed">{t.aiRecommendation}</p>
            </div>

            <div className="bg-surface border border-gray-700 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-textSecondary uppercase tracking-wide mb-3">Recommended Next Step</h2>
              <p className="text-sm text-textPrimary leading-relaxed">{t.recommendedNextStep}</p>
            </div>

            {/* ROI impact cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 text-center">
                <div className="text-base font-bold text-accent">{t.estimatedStaffTimeSaved}</div>
                <div className="text-xs text-textSecondary mt-1">Est. staff time saved</div>
              </div>
              <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 text-center">
                <div className="text-base font-bold text-accent">{t.followUpMessagesAvoided}</div>
                <div className="text-xs text-textSecondary mt-1">Est. follow-ups avoided</div>
              </div>
              <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 text-center">
                <div className="text-xs font-bold text-accent leading-tight">{t.estimatedResponseTimeImprovement}</div>
                <div className="text-xs text-textSecondary mt-1">Faster response est.</div>
              </div>
            </div>

            {/* Request details */}
            <div className="bg-surface border border-gray-700 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-textSecondary uppercase tracking-wide mb-3">Original Request</h2>
              <dl className="space-y-2 text-sm">
                {[
                  ['Description', req.description],
                  ['Active Damage', req.activePropertyDamage],
                  ['Hazard', req.hazardPresent],
                  ['Access', req.safeAccess],
                  ['Vulnerable Occupants', req.vulnerableOccupants],
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <dt className="text-textSecondary min-w-[120px]">{k}:</dt>
                    <dd className="text-textPrimary">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {/* Right: copy boxes */}
          <div className="space-y-4">
            <CopyBox label="Tenant Summary" content={t.tenantSummary} />
            <CopyBox label="PMS Work Order Summary" content={t.pmsWorkOrderSummary} />
            <CopyBox label="Tenant SMS Reply" content={t.tenantSmsReply} />
            <CopyBox label="Manager Mobile Alert" content={t.managerMobileAlert} />
            <CopyBox label="Vendor Dispatch Notes" content={t.vendorDispatchNotes} />
            <CopyBox label="Internal Audit Log Notes" content={t.internalAuditLog} />
          </div>
        </div>

        {/* Bottom CTA row */}
        <div className="flex flex-wrap gap-3 justify-center border-t border-gray-700 pt-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-accent hover:bg-accentHover text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors"
          >
            Open Manager Dashboard
          </button>
          <button
            onClick={() => navigate('/intake')}
            className="border border-gray-600 hover:border-gray-500 text-textPrimary font-medium px-5 py-2.5 rounded-lg text-sm transition-colors"
          >
            Submit Another Request
          </button>
          <button
            onClick={() => navigate('/audit-preview')}
            className="border border-accent/50 hover:border-accent text-accent font-medium px-5 py-2.5 rounded-lg text-sm transition-colors"
          >
            Book Free Workflow Audit
          </button>
        </div>
      </div>
    </div>
  );
}
