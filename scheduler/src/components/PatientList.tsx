import { useState } from 'react';
import { useStore } from '../store';
import { Patient } from '../types';
import PatientForm from './PatientForm';

export default function PatientList() {
  const { patients, addPatient, updatePatient, archivePatient } = useStore();
  const [search, setSearch] = useState('');
  const [editingPatient, setEditingPatient] = useState<Patient | null | 'new'>( null);

  const activePatients = patients.filter((p) => !p.archived);
  const filtered = activePatients.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.address.toLowerCase().includes(search.toLowerCase())
  );

  const contactBadge = (pref: string) => {
    if (pref === 'TEXT') return <span>💬</span>;
    if (pref === 'CALL') return <span>📞</span>;
    return <span>📞💬</span>;
  };

  const handleSave = (patient: Patient) => {
    if (editingPatient === 'new') {
      addPatient(patient);
    } else {
      updatePatient(patient.id, patient);
    }
    setEditingPatient(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-3 pt-4 pb-2 bg-white border-b border-gray-100">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search patients..."
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <div className="text-xs text-gray-400 mt-1 px-1">
          {filtered.length} active patient{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Patient Rows */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-8 text-sm">No patients found.</div>
        ) : (
          filtered.map((patient) => (
            <div
              key={patient.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800 text-sm">{patient.name}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        patient.amPmPreference === 'AM'
                          ? 'bg-amber-100 text-amber-700'
                          : patient.amPmPreference === 'PM'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {patient.amPmPreference}
                    </span>
                    {contactBadge(patient.contactPreference)}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5 truncate">{patient.address}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {patient.defaultWeeklyVisits}x/week • {patient.defaultVisitDuration} min
                  </div>
                  {patient.notes && (
                    <div className="text-xs text-gray-400 mt-0.5 italic truncate">{patient.notes}</div>
                  )}
                </div>
                <div className="flex flex-col gap-1 ml-3 flex-shrink-0">
                  <button
                    onClick={() => setEditingPatient(patient)}
                    className="text-xs bg-blue-100 text-blue-700 rounded-lg px-2.5 py-1 font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Archive ${patient.name}?`)) archivePatient(patient.id);
                    }}
                    className="text-xs bg-red-100 text-red-600 rounded-lg px-2.5 py-1 font-medium"
                  >
                    Archive
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setEditingPatient('new')}
        className="fixed bottom-24 right-4 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg text-2xl flex items-center justify-center hover:bg-blue-700 z-40"
      >
        +
      </button>

      {/* Patient Form Modal */}
      {editingPatient !== null && (
        <PatientForm
          initial={editingPatient === 'new' ? undefined : editingPatient}
          onSave={handleSave}
          onCancel={() => setEditingPatient(null)}
        />
      )}
    </div>
  );
}
