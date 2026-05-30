import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { runTriage } from '../triageLogic';
import { addRequest } from '../store';
import type { Category, MaintenanceRequest } from '../types';

const CATEGORIES: Category[] = [
  'Plumbing', 'HVAC', 'Electrical', 'Appliance', 'Pest', 'Doors/Locks', 'General Maintenance', 'Other',
];

function createPestDemo(): MaintenanceRequest {
  const id = 'demo-pest-' + Date.now();
  const input = {
    residentName: 'Sam Torres',
    propertyName: 'Maplewood Commons',
    unitNumber: '88B',
    phone: '555-0088',
    email: 'sam.torres@email.com',
    category: 'Pest' as Category,
    description: 'I have seen several cockroaches in my kitchen and bathroom over the past week. They are coming out at night.',
    activePropertyDamage: 'no' as const,
    hazardPresent: 'no' as const,
    safeAccess: 'yes' as const,
    vulnerableOccupants: 'none' as const,
  };
  const triageResult = runTriage(input);
  return {
    ...input,
    id,
    urgency: triageResult.urgency,
    status: 'Ready for Review',
    triageResult,
    createdAt: new Date().toISOString(),
  };
}

export default function IntakePage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    residentName: '',
    propertyName: '',
    unitNumber: '',
    phone: '',
    email: '',
    category: 'Plumbing' as Category,
    description: '',
    activePropertyDamage: 'no' as 'yes' | 'no' | 'not_sure',
    hazardPresent: 'no' as 'yes' | 'no' | 'not_sure',
    safeAccess: 'yes' as 'yes' | 'no' | 'not_sure',
    vulnerableOccupants: 'none' as 'none' | 'young_child' | 'elderly' | 'medical' | 'multiple',
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = 'req-' + Date.now();
    const triageResult = runTriage(form);
    const req: MaintenanceRequest = {
      ...form,
      id,
      urgency: triageResult.urgency,
      status: 'Ready for Review',
      triageResult,
      createdAt: new Date().toISOString(),
    };
    addRequest(req);
    navigate('/triage/' + id);
  }

  function handlePestDemo() {
    const req = createPestDemo();
    addRequest(req);
    navigate('/triage/' + req.id);
  }

  const labelClass = 'block text-sm font-medium text-textSecondary mb-1';
  const inputClass = 'w-full bg-surface2 border border-gray-700 text-textPrimary rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent';
  const selectClass = inputClass;

  return (
    <div className="min-h-screen bg-bg py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-textPrimary mb-2">Submit Maintenance Request</h1>
        <p className="text-textSecondary text-sm mb-6">
          Complete the form below. The system will triage the request and generate a ready-to-review work order.
        </p>

        {/* Quick demo buttons */}
        <div className="bg-surface border border-gray-700 rounded-xl p-4 mb-6">
          <p className="text-xs font-medium text-textSecondary mb-3">Quick Load Demo:</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate('/triage/demo-3')}
              className="text-xs px-3 py-1.5 rounded border border-accent text-accent hover:bg-accent/10 transition-colors"
            >
              Load AC Outage Demo
            </button>
            <button
              type="button"
              onClick={() => navigate('/triage/demo-1')}
              className="text-xs px-3 py-1.5 rounded border border-accent text-accent hover:bg-accent/10 transition-colors"
            >
              Load Leaking Sink Demo
            </button>
            <button
              type="button"
              onClick={() => navigate('/triage/demo-4')}
              className="text-xs px-3 py-1.5 rounded border border-accent text-accent hover:bg-accent/10 transition-colors"
            >
              Load Broken Lock Demo
            </button>
            <button
              type="button"
              onClick={handlePestDemo}
              className="text-xs px-3 py-1.5 rounded border border-gray-600 text-textSecondary hover:text-textPrimary hover:border-gray-500 transition-colors"
            >
              Load Pest Complaint Demo
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface border border-gray-700 rounded-xl p-6 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Resident Name *</label>
              <input name="residentName" required value={form.residentName} onChange={handleChange} className={inputClass} placeholder="Jane Doe" />
            </div>
            <div>
              <label className={labelClass}>Property Name *</label>
              <input name="propertyName" required value={form.propertyName} onChange={handleChange} className={inputClass} placeholder="Sunset Gardens" />
            </div>
            <div>
              <label className={labelClass}>Unit Number *</label>
              <input name="unitNumber" required value={form.unitNumber} onChange={handleChange} className={inputClass} placeholder="101A" />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input name="phone" value={form.phone} onChange={handleChange} className={inputClass} placeholder="555-0100" />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} className={inputClass} placeholder="resident@email.com" />
            </div>
            <div>
              <label className={labelClass}>Category *</label>
              <select name="category" value={form.category} onChange={handleChange} className={selectClass}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Description *</label>
            <textarea
              name="description"
              required
              value={form.description}
              onChange={handleChange}
              rows={4}
              className={inputClass + ' resize-none'}
              placeholder="Describe the maintenance issue in detail..."
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Active Property Damage?</label>
              <select name="activePropertyDamage" value={form.activePropertyDamage} onChange={handleChange} className={selectClass}>
                <option value="no">No</option>
                <option value="yes">Yes</option>
                <option value="not_sure">Not Sure</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Hazard Present?</label>
              <select name="hazardPresent" value={form.hazardPresent} onChange={handleChange} className={selectClass}>
                <option value="no">No</option>
                <option value="yes">Yes</option>
                <option value="not_sure">Not Sure</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Safe Access Available?</label>
              <select name="safeAccess" value={form.safeAccess} onChange={handleChange} className={selectClass}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="not_sure">Not Sure</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Vulnerable Occupants?</label>
              <select name="vulnerableOccupants" value={form.vulnerableOccupants} onChange={handleChange} className={selectClass}>
                <option value="none">None</option>
                <option value="young_child">Young Child</option>
                <option value="elderly">Elderly</option>
                <option value="medical">Medical Need</option>
                <option value="multiple">Multiple</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-accent hover:bg-accentHover text-white font-semibold py-3 rounded-lg transition-colors mt-2"
          >
            Submit & Triage Request
          </button>
        </form>
      </div>
    </div>
  );
}
