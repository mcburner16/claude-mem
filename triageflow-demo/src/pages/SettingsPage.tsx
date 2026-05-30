import { useState } from 'react';

function Toggle({ checked }: { checked: boolean }) {
  const [on] = useState(checked);
  return (
    <div
      className={`relative inline-flex items-center w-10 h-5 rounded-full transition-colors ${
        on ? 'bg-accent' : 'bg-gray-600'
      }`}
    >
      <span
        className={`absolute w-4 h-4 bg-white rounded-full shadow transition-transform ${
          on ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </div>
  );
}

const EMERGENCY_RULES = [
  'Active water leak',
  'Gas smell detected',
  'Smoke or sparks',
  'Sewage backup',
  'No AC above 85°F (with vulnerable occupants)',
  'No heat below 55°F',
  'Broken exterior lock (security risk)',
];

const VENDOR_MAP = [
  { category: 'Plumbing', vendor: 'ACE Emergency Plumbing' },
  { category: 'HVAC', vendor: 'CoolAir HVAC Services' },
  { category: 'Electrical', vendor: 'Reliable Electric Co.' },
  { category: 'Doors/Locks', vendor: 'QuickLock Locksmiths' },
  { category: 'Pest', vendor: 'GreenShield Pest Control' },
];

const APPROVAL_STEPS = [
  { label: 'AI Prepares', icon: '🤖' },
  { label: 'Manager Reviews', icon: '👁️' },
  { label: 'Manager Approves', icon: '✅' },
  { label: 'Vendor Contacted', icon: '📞' },
];

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-bg py-10 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Demo Mode Banner */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3 mb-6 text-center">
          <p className="text-yellow-400 text-sm font-medium">
            Demo Mode — Settings shown for illustration only. Changes do not persist.
          </p>
        </div>

        <h1 className="text-2xl font-bold text-textPrimary mb-6">Settings</h1>

        {/* Emergency Rules */}
        <div className="bg-surface border border-gray-700 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-textPrimary mb-1">Emergency Rules</h2>
          <p className="text-textSecondary text-sm mb-4">These conditions automatically trigger Emergency-level priority during triage.</p>
          <ul className="space-y-3">
            {EMERGENCY_RULES.map((rule) => (
              <li key={rule} className="flex items-center justify-between">
                <span className="text-sm text-textPrimary">{rule}</span>
                <Toggle checked={true} />
              </li>
            ))}
          </ul>
        </div>

        {/* Vendor Routing */}
        <div className="bg-surface border border-gray-700 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-textPrimary mb-1">Vendor Routing</h2>
          <p className="text-textSecondary text-sm mb-4">Default vendor assignment by issue category.</p>
          <div className="space-y-3">
            {VENDOR_MAP.map(({ category, vendor }) => (
              <div key={category} className="flex items-center justify-between gap-4">
                <span className="text-sm text-textSecondary min-w-[100px]">{category}</span>
                <div className="flex-1">
                  <select
                    defaultValue={vendor}
                    className="w-full bg-surface2 border border-gray-600 text-textPrimary text-sm rounded px-3 py-1.5 focus:outline-none focus:border-accent"
                  >
                    <option>{vendor}</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Approval Workflow */}
        <div className="bg-surface border border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-bold text-textPrimary mb-1">Approval Workflow</h2>
          <p className="text-textSecondary text-sm mb-5">Every request flows through these stages before any vendor contact.</p>
          <div className="flex flex-wrap items-center gap-3 justify-center">
            {APPROVAL_STEPS.map((step, i) => (
              <div key={step.label} className="flex items-center gap-3">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-xl mx-auto mb-1">
                    {step.icon}
                  </div>
                  <p className="text-xs text-textPrimary font-medium w-16 text-center">{step.label}</p>
                </div>
                {i < APPROVAL_STEPS.length - 1 && (
                  <span className="text-accent text-lg font-bold">→</span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center gap-2 justify-center">
            <span className="text-accent text-sm">🔒</span>
            <p className="text-sm text-textSecondary">
              Vendor contact only occurs after manager explicitly approves dispatch.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
