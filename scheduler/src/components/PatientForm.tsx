import React, { useState } from 'react';
import { Patient, AmPmPreference, ContactPreference } from '../types';

function geocodeAddress(address: string): { lat: number; lng: number } {
  const hash = address.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return {
    lat: 36.1 + ((hash % 60) - 30) * 0.01,
    lng: -86.8 + ((hash % 60) - 30) * 0.01,
  };
}

interface PatientFormProps {
  initial?: Patient;
  onSave: (patient: Patient) => void;
  onCancel: () => void;
}

export default function PatientForm({ initial, onSave, onCancel }: PatientFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [phoneNumber, setPhoneNumber] = useState(initial?.phoneNumber ?? '');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [amPmPreference, setAmPmPreference] = useState<AmPmPreference>(
    initial?.amPmPreference ?? 'EITHER'
  );
  const [contactPreference, setContactPreference] = useState<ContactPreference>(
    initial?.contactPreference ?? 'BOTH'
  );
  const [defaultWeeklyVisits, setDefaultWeeklyVisits] = useState(initial?.defaultWeeklyVisits ?? 2);
  const [defaultVisitDuration, setDefaultVisitDuration] = useState(
    initial?.defaultVisitDuration ?? 45
  );
  const [pointValue, setPointValue] = useState(initial?.pointValue ?? 1.0);
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const coords = initial?.lat ? { lat: initial.lat, lng: initial.lng } : geocodeAddress(address);
    const patient: Patient = {
      id: initial?.id ?? Math.random().toString(36).slice(2, 10),
      name: name.trim(),
      phoneNumber: phoneNumber.trim(),
      address: address.trim(),
      lat: coords.lat,
      lng: coords.lng,
      amPmPreference,
      contactPreference,
      defaultWeeklyVisits,
      defaultVisitDuration,
      pointValue,
      notes: notes.trim(),
      archived: initial?.archived ?? false,
    };
    onSave(patient);
  };

  const inputClass =
    'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300';
  const labelClass = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1';

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="bg-white w-full max-w-lg mx-auto rounded-t-2xl p-5 pb-8 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-800">
            {initial ? 'Edit Patient' : 'Add Patient'}
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 p-1">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Phone Number</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="(615) 555-0100"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St, Nashville, TN"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>AM/PM Preference</label>
            <div className="flex gap-2">
              {(['AM', 'PM', 'EITHER'] as AmPmPreference[]).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setAmPmPreference(opt)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    amPmPreference === opt
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass}>Contact Preference</label>
            <div className="flex gap-2">
              {(['CALL', 'TEXT', 'BOTH'] as ContactPreference[]).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setContactPreference(opt)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    contactPreference === opt
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Visits/Week</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDefaultWeeklyVisits(Math.max(1, defaultWeeklyVisits - 1))}
                  className="w-9 h-9 bg-gray-100 rounded-xl text-gray-700 font-bold text-lg flex items-center justify-center"
                >
                  −
                </button>
                <span className="flex-1 text-center font-bold text-gray-800 text-lg">
                  {defaultWeeklyVisits}
                </span>
                <button
                  type="button"
                  onClick={() => setDefaultWeeklyVisits(defaultWeeklyVisits + 1)}
                  className="w-9 h-9 bg-gray-100 rounded-xl text-gray-700 font-bold text-lg flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className={labelClass}>Duration (min)</label>
              <input
                type="number"
                value={defaultVisitDuration}
                onChange={(e) => setDefaultVisitDuration(Number(e.target.value))}
                min={15}
                max={180}
                step={15}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Point Value</label>
            <div className="flex items-center gap-2">
              {[0.5, 1.0, 1.5, 2.0].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setPointValue(val)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    pointValue === val
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">Routine = 1.0 · Eval/SOC = 2.0</p>
          </div>

          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Access codes, parking notes, special instructions..."
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-3 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white rounded-xl py-3 text-sm font-bold"
            >
              {initial ? 'Save Changes' : 'Add Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
