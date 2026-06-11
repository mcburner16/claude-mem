import { useState } from 'react';
import { useStore } from '../store';
import { format, parseISO, addDays, startOfWeek } from 'date-fns';
import { NVAEntry } from '../types';
import { totalRouteMiles } from '../utils/haversine';
import { getWeekDates } from '../utils/scheduling';

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function getVisitPoints(visit: { pointValueOverride?: number }, patientPointValue: number): number {
  return visit.pointValueOverride ?? patientPointValue;
}

export default function PaycheckView() {
  const {
    weeks, visits, patients, nvaEntries, settings,
    addNVAEntry, removeNVAEntry, updateSettings,
  } = useStore();

  // Week selector: default to current week
  const today = format(new Date(), 'yyyy-MM-dd');
  const mondayOfToday = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const [selectedWeekStart, setSelectedWeekStart] = useState(mondayOfToday);

  const selectedWeek = weeks.find((w) => w.startDate === selectedWeekStart);

  // NVA form state
  const [showNvaForm, setShowNvaForm] = useState(false);
  const [nvaDesc, setNvaDesc] = useState('');
  const [nvaHours, setNvaHours] = useState('1');
  const [nvaRate, setNvaRate] = useState(String(settings.defaultNvaHourlyRate));
  const [nvaDate, setNvaDate] = useState(today);

  const weekDates = selectedWeek ? getWeekDates(selectedWeek.startDate) : [];

  // Completed visits this week
  const completedVisits = selectedWeek
    ? visits.filter(
        (v) => v.weekId === selectedWeek.id && v.status === 'COMPLETED'
      )
    : [];

  // Mileage: sum miles across all week days (AM before PM, then by specific time)
  const weekMiles = weekDates.reduce((total, date) => {
    const dayVisits = visits
      .filter((v) => selectedWeek && v.weekId === selectedWeek.id && v.date === date && v.status !== 'CANCELLED')
      .sort((a, b) => {
        if (a.timeBlock !== b.timeBlock) return a.timeBlock === 'AM' ? -1 : 1;
        return (a.specificTime ?? '').localeCompare(b.specificTime ?? '');
      });
    const coords = dayVisits
      .map((v) => patients.find((p) => p.id === v.patientId))
      .filter(Boolean)
      .map((p) => ({ lat: p!.lat, lng: p!.lng }));
    return total + totalRouteMiles(coords);
  }, 0);

  // NVA entries for this week
  const weekNva = nvaEntries.filter((e) => weekDates.includes(e.date));

  // Calculations — visit pay = pointValue × ppvRate per visit
  const visitPayTotal = completedVisits.reduce((sum, v) => {
    const patient = patients.find((p) => p.id === v.patientId);
    const pts = getVisitPoints(v, patient?.pointValue ?? 1.0);
    return sum + pts * settings.ppvRate;
  }, 0);
  const mileageTotal = weekMiles * settings.mileageRate;
  const nvaTotal = weekNva.reduce((sum, e) => sum + e.hours * e.hourlyRate, 0);
  const grandTotal = visitPayTotal + mileageTotal + nvaTotal;

  const handleAddNva = () => {
    if (!nvaDesc.trim() || !nvaHours || !nvaRate) return;
    const entry: NVAEntry = {
      id: makeId(),
      date: nvaDate,
      description: nvaDesc.trim(),
      hours: parseFloat(nvaHours),
      hourlyRate: parseFloat(nvaRate),
    };
    addNVAEntry(entry);
    setNvaDesc('');
    setNvaHours('1');
    setShowNvaForm(false);
  };

  const weekLabel = selectedWeek
    ? (() => {
        const dates = Array.from({ length: 7 }, (_, i) =>
          addDays(parseISO(selectedWeek.startDate), i)
        );
        return `${format(dates[0], 'MMM d')} – ${format(dates[6], 'MMM d')}`;
      })()
    : 'No week data';

  const inputClass =
    'border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300';

  // Week options for selector
  const weekOptions = [...weeks]
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
    .slice(0, 8);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <h1 className="text-lg font-bold text-gray-800">Paycheck Estimator</h1>
        <p className="text-xs text-gray-400 mt-0.5">Estimate only — before taxes & deductions</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Week Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Week</span>
          <select
            value={selectedWeekStart}
            onChange={(e) => setSelectedWeekStart(e.target.value)}
            className={`flex-1 ${inputClass}`}
          >
            {weekOptions.map((w) => {
              const end = format(addDays(parseISO(w.startDate), 6), 'MMM d');
              const start = format(parseISO(w.startDate), 'MMM d');
              return (
                <option key={w.id} value={w.startDate}>
                  {start} – {end}
                </option>
              );
            })}
            {weekOptions.length === 0 && (
              <option value={mondayOfToday}>{weekLabel}</option>
            )}
          </select>
        </div>

        {/* Rates row */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-xs text-gray-500 mb-1">PPV Rate</div>
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-500">$</span>
              <input
                type="number"
                value={settings.ppvRate}
                onChange={(e) => updateSettings({ ppvRate: parseFloat(e.target.value) || 0 })}
                className="w-full bg-transparent text-base font-bold text-gray-800 focus:outline-none"
                min={0}
                step={0.01}
              />
            </div>
            <div className="text-xs text-gray-400">per visit</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-xs text-gray-500 mb-1">Mileage Rate</div>
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-500">$</span>
              <input
                type="number"
                value={settings.mileageRate}
                onChange={(e) => updateSettings({ mileageRate: parseFloat(e.target.value) || 0 })}
                className="w-full bg-transparent text-base font-bold text-gray-800 focus:outline-none"
                min={0}
                step={0.01}
              />
            </div>
            <div className="text-xs text-gray-400">per mile</div>
          </div>
        </div>

        {/* Section 1: Visit Pay */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
            <span className="text-sm font-bold text-blue-800">Visit Pay</span>
            <span className="text-sm font-bold text-blue-700">${visitPayTotal.toFixed(2)}</span>
          </div>
          {completedVisits.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400">No completed visits this week yet</div>
          ) : (
            <div>
              {completedVisits.map((v) => {
                const patient = patients.find((p) => p.id === v.patientId);
                const pts = getVisitPoints(v, patient?.pointValue ?? 1.0);
                return (
                  <div key={v.id} className="px-4 py-2.5 border-b border-gray-50 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-800">{patient?.name ?? 'Unknown'}</div>
                      <div className="text-xs text-gray-400">
                        {format(parseISO(v.date), 'EEE MMM d')} · {v.timeBlock} · {pts.toFixed(1)} pt{pts !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-gray-700">${(pts * settings.ppvRate).toFixed(2)}</span>
                  </div>
                );
              })}
              <div className="px-4 py-2 flex items-center justify-between">
                <span className="text-xs text-gray-500">{completedVisits.length} completed visit{completedVisits.length !== 1 ? 's' : ''}</span>
                <span className="text-sm font-bold text-gray-800">${visitPayTotal.toFixed(2)}</span>
              </div>
            </div>
          )}
        </section>

        {/* Section 2: Mileage */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-green-50 border-b border-green-100 flex items-center justify-between">
            <span className="text-sm font-bold text-green-800">Mileage</span>
            <span className="text-sm font-bold text-green-700">${mileageTotal.toFixed(2)}</span>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-700">{weekMiles.toFixed(1)} estimated miles</div>
              <div className="text-xs text-gray-400">@ ${settings.mileageRate.toFixed(2)}/mile</div>
            </div>
            <span className="text-sm font-semibold text-gray-700">${mileageTotal.toFixed(2)}</span>
          </div>
        </section>

        {/* Section 3: NVA */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-purple-50 border-b border-purple-100 flex items-center justify-between">
            <span className="text-sm font-bold text-purple-800">Non-Visit Activities</span>
            <span className="text-sm font-bold text-purple-700">${nvaTotal.toFixed(2)}</span>
          </div>

          {weekNva.length === 0 && !showNvaForm && (
            <div className="px-4 py-3 text-sm text-gray-400">
              No NVA logged — meetings, in-services, SOC docs, etc.
            </div>
          )}

          {weekNva.map((entry) => (
            <div key={entry.id} className="px-4 py-2.5 border-b border-gray-50 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-800">{entry.description}</div>
                <div className="text-xs text-gray-400">
                  {format(parseISO(entry.date), 'EEE MMM d')} · {entry.hours}h @ ${entry.hourlyRate}/hr
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700">
                  ${(entry.hours * entry.hourlyRate).toFixed(2)}
                </span>
                <button
                  onClick={() => removeNVAEntry(entry.id)}
                  className="text-red-400 hover:text-red-600 text-lg leading-none px-1"
                >
                  ×
                </button>
              </div>
            </div>
          ))}

          {showNvaForm ? (
            <div className="px-4 py-3 space-y-2 border-t border-gray-100">
              <input
                type="text"
                value={nvaDesc}
                onChange={(e) => setNvaDesc(e.target.value)}
                placeholder="Description (e.g. Team meeting)"
                className={`w-full ${inputClass}`}
              />
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <div className="text-xs text-gray-400 mb-1">Hours</div>
                  <input
                    type="number"
                    value={nvaHours}
                    onChange={(e) => setNvaHours(e.target.value)}
                    min={0.25}
                    step={0.25}
                    className={`w-full ${inputClass}`}
                  />
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">$/hr</div>
                  <input
                    type="number"
                    value={nvaRate}
                    onChange={(e) => setNvaRate(e.target.value)}
                    min={0}
                    step={0.5}
                    className={`w-full ${inputClass}`}
                  />
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Date</div>
                  <input
                    type="date"
                    value={nvaDate}
                    onChange={(e) => setNvaDate(e.target.value)}
                    className={`w-full ${inputClass}`}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowNvaForm(false)}
                  className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddNva}
                  disabled={!nvaDesc.trim()}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold ${
                    nvaDesc.trim()
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Add NVA
                </button>
              </div>
            </div>
          ) : (
            <div className="px-4 py-2.5">
              <button
                onClick={() => setShowNvaForm(true)}
                className="w-full py-2 border-2 border-dashed border-purple-200 text-purple-500 rounded-xl text-sm font-semibold hover:border-purple-300 hover:text-purple-600 transition-colors"
              >
                + Add NVA
              </button>
            </div>
          )}
        </section>

        {/* Grand Total */}
        <section className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-4 shadow-md">
          <div className="text-blue-200 text-xs font-semibold uppercase tracking-wide mb-1">Estimated Total</div>
          <div className="text-white text-3xl font-bold mb-3">${grandTotal.toFixed(2)}</div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-blue-200">Visit pay ({completedVisits.length} visits)</span>
              <span className="text-white font-medium">${visitPayTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-blue-200">Mileage ({weekMiles.toFixed(1)} mi)</span>
              <span className="text-white font-medium">${mileageTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-blue-200">NVA</span>
              <span className="text-white font-medium">${nvaTotal.toFixed(2)}</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-blue-500">
            <p className="text-blue-300 text-xs">Estimate only — before taxes and deductions</p>
          </div>
        </section>

        <div className="h-4" />
      </div>
    </div>
  );
}
