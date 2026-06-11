import { useState } from 'react';
import { useStore } from '../store';
import { TimeBlock } from '../types';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Settings() {
  const { settings, updateSettings, timeBlocks, addTimeBlock, removeTimeBlock } = useStore();
  const [saved, setSaved] = useState(false);
  const [newBlock, setNewBlock] = useState({
    label: '',
    startTime: '12:00',
    endTime: '13:00',
    recurrenceRule: 'WEEKDAYS',
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAddBlock = () => {
    if (!newBlock.label.trim()) return;
    const block: TimeBlock = {
      id: Math.random().toString(36).slice(2, 10),
      label: newBlock.label.trim(),
      startTime: newBlock.startTime,
      endTime: newBlock.endTime,
      recurrenceRule: newBlock.recurrenceRule,
    };
    addTimeBlock(block);
    setNewBlock({ label: '', startTime: '12:00', endTime: '13:00', recurrenceRule: 'WEEKDAYS' });
  };

  const inputClass =
    'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300';
  const labelClass = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1';

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-800">Settings</h1>
        <button
          onClick={handleSave}
          className={`text-sm font-semibold px-4 py-2 rounded-xl transition-colors ${
            saved ? 'bg-green-100 text-green-700' : 'bg-blue-600 text-white'
          }`}
        >
          {saved ? '✓ Saved' : 'Save'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* Clinician Info */}
        <section>
          <h2 className="text-sm font-bold text-gray-700 mb-3">Clinician Info</h2>
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Your Name</label>
              <input
                type="text"
                value={settings.clinicianName}
                onChange={(e) => updateSettings({ clinicianName: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Agency Name</label>
              <input
                type="text"
                value={settings.agencyName}
                onChange={(e) => updateSettings({ agencyName: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
        </section>

        {/* Working Days */}
        <section>
          <h2 className="text-sm font-bold text-gray-700 mb-3">Working Days</h2>
          <div className="flex gap-2">
            {DAY_NAMES.map((day, i) => {
              const isActive = settings.workingDays.includes(i);
              return (
                <button
                  key={day}
                  onClick={() => {
                    const days = isActive
                      ? settings.workingDays.filter((d) => d !== i)
                      : [...settings.workingDays, i].sort();
                    updateSettings({ workingDays: days });
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    isActive ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </section>

        {/* Time Windows */}
        <section>
          <h2 className="text-sm font-bold text-gray-700 mb-3">Time Windows</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>AM Start</label>
              <input
                type="time"
                value={settings.amWindowStart}
                onChange={(e) => updateSettings({ amWindowStart: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>AM End</label>
              <input
                type="time"
                value={settings.amWindowEnd}
                onChange={(e) => updateSettings({ amWindowEnd: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>PM Start</label>
              <input
                type="time"
                value={settings.pmWindowStart}
                onChange={(e) => updateSettings({ pmWindowStart: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>PM End</label>
              <input
                type="time"
                value={settings.pmWindowEnd}
                onChange={(e) => updateSettings({ pmWindowEnd: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
        </section>

        {/* Default Visit Duration */}
        <section>
          <h2 className="text-sm font-bold text-gray-700 mb-3">Default Visit Duration</h2>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={settings.defaultVisitDuration}
              onChange={(e) => updateSettings({ defaultVisitDuration: Number(e.target.value) })}
              min={15}
              max={180}
              step={15}
              className="w-24 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <span className="text-sm text-gray-500">minutes</span>
          </div>
        </section>

        {/* Message Template */}
        <section>
          <h2 className="text-sm font-bold text-gray-700 mb-1">Confirmation Message Template</h2>
          <p className="text-xs text-gray-400 mb-2">
            Variables: {'{firstName}'}, {'{clinicianName}'}, {'{agencyName}'}, {'{day}'}, {'{timeWindow}'}
          </p>
          <textarea
            value={settings.messageTemplate}
            onChange={(e) => updateSettings({ messageTemplate: e.target.value })}
            rows={5}
            className={`${inputClass} resize-none`}
          />
        </section>

        {/* Time Blocks */}
        <section>
          <h2 className="text-sm font-bold text-gray-700 mb-3">Recurring Time Blocks</h2>
          <p className="text-xs text-gray-400 mb-3">Add blocks for lunch, appointments, etc.</p>

          {timeBlocks.length > 0 && (
            <div className="space-y-2 mb-4">
              {timeBlocks.map((block) => (
                <div
                  key={block.id}
                  className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5"
                >
                  <div>
                    <div className="text-sm font-semibold text-gray-700">{block.label}</div>
                    <div className="text-xs text-gray-400">
                      {block.startTime} – {block.endTime} • {block.recurrenceRule}
                    </div>
                  </div>
                  <button
                    onClick={() => removeTimeBlock(block.id)}
                    className="text-red-400 hover:text-red-600 text-lg px-2"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="bg-gray-50 rounded-xl p-3 space-y-2">
            <input
              type="text"
              value={newBlock.label}
              onChange={(e) => setNewBlock({ ...newBlock, label: e.target.value })}
              placeholder="Label (e.g. Lunch Break)"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="time"
                value={newBlock.startTime}
                onChange={(e) => setNewBlock({ ...newBlock, startTime: e.target.value })}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <input
                type="time"
                value={newBlock.endTime}
                onChange={(e) => setNewBlock({ ...newBlock, endTime: e.target.value })}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <select
              value={newBlock.recurrenceRule}
              onChange={(e) => setNewBlock({ ...newBlock, recurrenceRule: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <option value="DAILY">Daily</option>
              <option value="WEEKDAYS">Weekdays</option>
            </select>
            <button
              onClick={handleAddBlock}
              disabled={!newBlock.label.trim()}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                newBlock.label.trim()
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Add Block
            </button>
          </div>
        </section>

        {/* Session Stats */}
        <section>
          <h2 className="text-sm font-bold text-gray-700 mb-1">About</h2>
          <p className="text-xs text-gray-400">Home Health Weekly Scheduler v0.1.0</p>
        </section>
      </div>
    </div>
  );
}
