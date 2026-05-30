export default function AuditPreviewPage() {
  return (
    <div className="min-h-screen bg-bg py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-14">
          <span className="inline-block bg-accent/20 text-accent text-sm font-medium px-4 py-1.5 rounded-full mb-5 border border-accent/30">
            No-Cost Assessment
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-textPrimary mb-4">
            Free Maintenance Workflow Audit
          </h1>
          <p className="text-lg text-textSecondary max-w-2xl mx-auto">
            We'll map your current intake process, identify bottlenecks, and show you exactly where triage automation would save time.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-6 mb-12">
          {/* Current State */}
          <div className="bg-surface border border-gray-700 rounded-xl p-6">
            <h2 className="text-lg font-bold text-textPrimary mb-3">1. Current State Assessment</h2>
            <p className="text-textSecondary text-sm mb-3">We'll document how maintenance requests currently come in to your team:</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {['Phone calls', 'Email', 'Text messages', 'Walk-ins', 'Resident portals', 'Mixed / inconsistent channels'].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-textSecondary">
                  <span className="text-accent">→</span> {item}
                </div>
              ))}
            </div>
          </div>

          {/* Bottlenecks */}
          <div className="bg-surface border border-gray-700 rounded-xl p-6">
            <h2 className="text-lg font-bold text-textPrimary mb-3">2. Bottleneck Identification</h2>
            <p className="text-textSecondary text-sm mb-3">Common friction points we look for in your current workflow:</p>
            <ul className="space-y-2">
              {[
                'Back-and-forth calls/texts to gather basic details',
                'Unclear urgency leading to mis-prioritized requests',
                'Staff interruptions at odd hours for non-emergency issues',
                'Vendors arriving without adequate problem description',
                'Inconsistent documentation across team members',
                'No structured audit trail for completed work orders',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-textSecondary">
                  <span className="text-red-400 mt-0.5">✗</span> {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Ideal State */}
          <div className="bg-surface border border-gray-700 rounded-xl p-6">
            <h2 className="text-lg font-bold text-textPrimary mb-3">3. Ideal State Design</h2>
            <p className="text-textSecondary text-sm mb-4">A structured workflow that keeps your team in control:</p>
            <div className="flex flex-wrap gap-2 items-center">
              {[
                'Structured intake',
                '→',
                'AI triage',
                '→',
                'Ready-to-review work order',
                '→',
                'Manager approves',
                '→',
                'Vendor dispatched',
              ].map((step, i) => (
                <span
                  key={i}
                  className={
                    step === '→'
                      ? 'text-textSecondary'
                      : 'bg-accent/10 border border-accent/30 text-accent text-xs font-medium px-3 py-1 rounded-full'
                  }
                >
                  {step}
                </span>
              ))}
            </div>
            <p className="text-xs text-textSecondary mt-4">
              🔒 Human approval always required before any vendor contact.
            </p>
          </div>

          {/* Deliverables */}
          <div className="bg-accent/10 border border-accent/30 rounded-xl p-6">
            <h2 className="text-lg font-bold text-textPrimary mb-4">4. What You Receive</h2>
            <ul className="space-y-3">
              {[
                'Maintenance intake map — visual diagram of your current request flow',
                'Emergency rule review — confirm which scenarios trigger immediate response',
                'Vendor routing blueprint — match issue categories to preferred vendors',
                'Tenant messaging recommendations — standard reply templates for each urgency level',
                'Pilot implementation plan — step-by-step rollout tailored to your team size',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-textPrimary">
                  <span className="text-accent font-bold mt-0.5">✓</span> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <h2 className="text-xl font-bold text-textPrimary mb-3">Ready to See Where Time Is Being Lost?</h2>
          <p className="text-textSecondary text-sm mb-6">
            The audit takes about 45 minutes and is completely free. No commitment required.
          </p>
          <button className="bg-accent hover:bg-accentHover text-white font-semibold px-10 py-4 rounded-xl text-base transition-colors">
            Request Free Workflow Audit
          </button>
          <p className="text-xs text-textSecondary mt-4">
            Demo only — this button would connect to a scheduling link in production.
          </p>
        </div>
      </div>
    </div>
  );
}
