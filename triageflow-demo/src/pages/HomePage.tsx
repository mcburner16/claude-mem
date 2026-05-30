import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function ROICalculator() {
  const [units, setUnits] = useState(150);
  const [reqPerUnit, setReqPerUnit] = useState(1.5);
  const [followUpMin, setFollowUpMin] = useState(22);
  const [hourlyCost, setHourlyCost] = useState(28);
  const [pilotPrice, setPilotPrice] = useState(799);

  const reqPerWeek = Math.round((units * reqPerUnit * 12) / 52);
  const hoursSaved = (units * reqPerUnit * followUpMin) / 60 * 0.6;
  const laborValue = hoursSaved * hourlyCost;
  const netRoi = laborValue - pilotPrice;

  return (
    <div className="bg-surface border border-gray-700 rounded-xl p-6 md:p-8">
      <h3 className="text-xl font-bold text-textPrimary mb-2">ROI Estimator</h3>
      <p className="text-textSecondary text-sm mb-6">
        Adjust the sliders to estimate potential time and cost savings for your community.
      </p>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div>
          <label className="block text-sm font-medium text-textSecondary mb-1">
            Units: <span className="text-textPrimary font-bold">{units}</span>
          </label>
          <input
            type="range" min={1} max={500} value={units}
            onChange={(e) => setUnits(Number(e.target.value))}
            className="w-full accent-accent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-textSecondary mb-1">
            Requests/unit/month: <span className="text-textPrimary font-bold">{reqPerUnit.toFixed(1)}</span>
          </label>
          <input
            type="range" min={0.5} max={5} step={0.1} value={reqPerUnit}
            onChange={(e) => setReqPerUnit(Number(e.target.value))}
            className="w-full accent-accent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-textSecondary mb-1">
            Avg staff follow-up (min/request): <span className="text-textPrimary font-bold">{followUpMin}</span>
          </label>
          <input
            type="range" min={5} max={60} value={followUpMin}
            onChange={(e) => setFollowUpMin(Number(e.target.value))}
            className="w-full accent-accent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-textSecondary mb-1">
            Staff hourly cost: <span className="text-textPrimary font-bold">${hourlyCost}/hr</span>
          </label>
          <input
            type="range" min={15} max={75} value={hourlyCost}
            onChange={(e) => setHourlyCost(Number(e.target.value))}
            className="w-full accent-accent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-textSecondary mb-1">
            Monthly pilot price: <span className="text-textPrimary font-bold">${pilotPrice}/mo</span>
          </label>
          <input
            type="range" min={499} max={1199} step={100} value={pilotPrice}
            onChange={(e) => setPilotPrice(Number(e.target.value))}
            className="w-full accent-accent"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="bg-surface2 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-textPrimary">{reqPerWeek}</div>
          <div className="text-xs text-textSecondary mt-1">Est. requests/week</div>
        </div>
        <div className="bg-surface2 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-accent">{hoursSaved.toFixed(1)} hrs</div>
          <div className="text-xs text-textSecondary mt-1">Est. follow-up hours saved/month</div>
          <div className="text-xs text-gray-600 mt-0.5">(~60% reduction est.)</div>
        </div>
        <div className="bg-surface2 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-textPrimary">${Math.round(laborValue).toLocaleString()}</div>
          <div className="text-xs text-textSecondary mt-1">Est. labor value saved/month</div>
        </div>
        <div className={`rounded-lg p-4 text-center ${netRoi >= 0 ? 'bg-accent/10 border border-accent/30' : 'bg-red-500/10 border border-red-500/30'}`}>
          <div className={`text-2xl font-bold ${netRoi >= 0 ? 'text-accent' : 'text-red-400'}`}>
            {netRoi >= 0 ? '+' : ''}${Math.round(netRoi).toLocaleString()}
          </div>
          <div className="text-xs text-textSecondary mt-1">Est. net ROI/month</div>
        </div>
      </div>

      <p className="text-xs text-textSecondary italic">
        All figures are estimates based on your inputs. Actual results will vary based on request type, team workflow, and configuration.
      </p>
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg">
      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 py-16 md:py-24 text-center">
        <span className="inline-block bg-accent/20 text-accent text-sm font-medium px-4 py-1.5 rounded-full mb-6 border border-accent/30">
          Maintenance Triage Copilot
        </span>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-textPrimary mb-6 leading-tight">
          AI Maintenance Triage for<br className="hidden sm:block" /> Apartment Communities
        </h1>
        <p className="text-lg text-textSecondary max-w-2xl mx-auto mb-10">
          Turn vague resident maintenance messages into clarified, prioritized, ready-to-review work orders before your staff or vendors waste time chasing details.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate('/triage/demo-3')}
            className="bg-accent hover:bg-accentHover text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Load AC Outage Demo
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="border border-gray-600 hover:border-accent text-textPrimary font-semibold px-6 py-3 rounded-lg transition-colors hover:text-accent"
          >
            View Manager Dashboard
          </button>
        </div>
      </section>

      {/* Human Approval Banner */}
      <div className="bg-accent/10 border-y border-accent/30 py-4 px-4 text-center mb-12">
        <p className="text-textPrimary font-semibold text-sm md:text-base">
          🔒 <strong>Human Approval Required</strong> — The system prepares the request. Your team reviews and approves next steps before any vendor is contacted.
        </p>
      </div>

      {/* Before/After */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-bold text-textPrimary text-center mb-8">How It Changes Your Workflow</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6">
            <h3 className="text-lg font-bold text-red-400 mb-4">The Old Way</h3>
            <ul className="space-y-3 text-sm text-textSecondary">
              <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5">✗</span>Vague messages → Staff back-and-forth</li>
              <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5">✗</span>Unclear urgency → Unnecessary after-hours calls</li>
              <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5">✗</span>Missing details → Vendor arrives unprepared</li>
              <li className="flex items-start gap-2"><span className="text-red-500 mt-0.5">✗</span>Inconsistent documentation</li>
            </ul>
          </div>
          <div className="bg-accent/5 border border-accent/20 rounded-xl p-6">
            <h3 className="text-lg font-bold text-accent mb-4">With TriageFlow AI</h3>
            <ul className="space-y-3 text-sm text-textSecondary">
              <li className="flex items-start gap-2"><span className="text-accent mt-0.5">✓</span>Clarified intake → Clear priority level</li>
              <li className="flex items-start gap-2"><span className="text-accent mt-0.5">✓</span>Urgency recommendation → Right vendor, right time</li>
              <li className="flex items-start gap-2"><span className="text-accent mt-0.5">✓</span>Complete work order → Ready for manager review</li>
              <li className="flex items-start gap-2"><span className="text-accent mt-0.5">✓</span>Human approval required → Consistent audit trail</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ROI Calculator */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-bold text-textPrimary text-center mb-8">Estimate Your Savings</h2>
        <ROICalculator />
      </section>

      {/* Pricing */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-bold text-textPrimary text-center mb-3">Pilot Pricing</h2>
        <p className="text-textSecondary text-center text-sm mb-8">Pilot pricing shown for demo purposes. Final pricing depends on unit count, request volume, support needs, and integrations.</p>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              name: 'Starter',
              price: 'Starting at $499/month',
              features: ['Up to 150 units', 'Core triage + work order prep', 'Email support'],
            },
            {
              name: 'Growth',
              price: 'Starting at $799/month',
              features: ['150–300 units', 'Everything in Starter', 'Vendor routing map', 'Priority support'],
              featured: true,
            },
            {
              name: 'Operations',
              price: 'Starting at $1,199/month',
              features: ['300+ units', 'Full workflow audit', 'Implementation support', 'Dedicated onboarding'],
            },
          ].map((plan) => (
            <div
              key={plan.name}
              className={`rounded-xl p-6 border ${
                plan.featured
                  ? 'bg-accent/10 border-accent/40'
                  : 'bg-surface border-gray-700'
              }`}
            >
              {plan.featured && (
                <span className="inline-block bg-accent text-white text-xs font-bold px-2 py-0.5 rounded mb-3">
                  Most Popular
                </span>
              )}
              <h3 className="text-lg font-bold text-textPrimary mb-1">{plan.name}</h3>
              <p className="text-accent font-semibold mb-4">{plan.price}</p>
              <ul className="space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-textSecondary">
                    <span className="text-accent mt-0.5">✓</span>{f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* What This Does Not Do */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <div className="bg-surface border border-gray-700 rounded-xl p-6 md:p-8">
          <h2 className="text-xl font-bold text-textPrimary mb-4">What This Does Not Do</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { icon: '✗', text: 'Does not replace property management software', positive: false },
              { icon: '✗', text: 'Does not dispatch vendors without manager approval', positive: false },
              { icon: '✗', text: 'Does not replace maintenance staff', positive: false },
              { icon: '✗', text: 'Does not make legal or lease decisions', positive: false },
              { icon: '✓', text: 'Does prepare clearer maintenance requests for faster human review', positive: true },
            ].map((item) => (
              <div key={item.text} className="flex items-start gap-2 text-sm">
                <span className={`mt-0.5 font-bold ${item.positive ? 'text-accent' : 'text-red-400'}`}>
                  {item.icon}
                </span>
                <span className={item.positive ? 'text-textPrimary' : 'text-textSecondary'}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-5xl mx-auto px-4 pb-20 text-center">
        <h2 className="text-2xl font-bold text-textPrimary mb-4">See How It Would Work for Your Community</h2>
        <p className="text-textSecondary mb-6">We'll map your current intake process and show you exactly where triage automation would save time.</p>
        <button
          onClick={() => navigate('/audit-preview')}
          className="bg-accent hover:bg-accentHover text-white font-semibold px-8 py-3 rounded-lg transition-colors"
        >
          Book Free Maintenance Workflow Audit
        </button>
      </section>
    </div>
  );
}
