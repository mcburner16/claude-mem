import { useStore } from '../store';
import { format, parseISO } from 'date-fns';
import { Visit } from '../types';

export default function ConfirmationQueue() {
  const { visits, patients, settings, setConfirmationStatus } = useStore();

  const pendingVisits = visits.filter(
    (v) =>
      v.status !== 'CANCELLED' &&
      (v.confirmationStatus === 'PENDING' || v.confirmationStatus === 'SENT')
  );

  if (pendingVisits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <span className="text-4xl mb-3">✓</span>
        <p className="text-sm font-medium">All caught up!</p>
        <p className="text-xs mt-1">No pending confirmations.</p>
      </div>
    );
  }

  const buildMessage = (visit: Visit, patientName: string): string => {
    const firstName = patientName.split(' ')[0];
    const day = format(parseISO(visit.date), 'EEEE, MMMM d');
    const timeWindow =
      visit.timeBlock === 'AM'
        ? `${settings.amWindowStart} and ${settings.amWindowEnd}`
        : `${settings.pmWindowStart} and ${settings.pmWindowEnd}`;

    return settings.messageTemplate
      .replace('{firstName}', firstName)
      .replace('{clinicianName}', settings.clinicianName)
      .replace('{agencyName}', settings.agencyName)
      .replace('{day}', day)
      .replace('{timeWindow}', timeWindow);
  };

  const confirmColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    SENT: 'bg-orange-100 text-orange-700',
  };

  return (
    <div className="px-3 py-4 space-y-3">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
        Needs Confirmation ({pendingVisits.length})
      </div>

      {pendingVisits.map((visit) => {
        const patient = patients.find((p) => p.id === visit.patientId);
        if (!patient) return null;
        const message = buildMessage(visit, patient.name);
        const encodedMessage = encodeURIComponent(message);
        const phone = patient.phoneNumber.replace(/\D/g, '');
        const day = format(parseISO(visit.date), 'EEE MMM d');
        const timeWindow =
          visit.timeBlock === 'AM'
            ? `${settings.amWindowStart}–${settings.amWindowEnd}`
            : `${settings.pmWindowStart}–${settings.pmWindowEnd}`;

        return (
          <div
            key={visit.id}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-3"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="font-semibold text-gray-800 text-sm">{patient.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {day} • {visit.timeBlock} ({timeWindow})
                </div>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${
                  confirmColors[visit.confirmationStatus]
                }`}
              >
                {visit.confirmationStatus}
              </span>
            </div>

            {/* Message Preview */}
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600 mb-3">
              {message}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 flex-wrap">
              {(patient.contactPreference === 'TEXT' || patient.contactPreference === 'BOTH') && (
                <a
                  href={`sms:${phone}?body=${encodedMessage}`}
                  onClick={() => setConfirmationStatus(visit.id, 'SENT')}
                  className="flex-1 min-w-0 bg-blue-100 text-blue-700 rounded-lg py-2 text-xs font-semibold text-center"
                >
                  💬 Send Text
                </a>
              )}
              {(patient.contactPreference === 'CALL' || patient.contactPreference === 'BOTH') && (
                <a
                  href={`tel:${phone}`}
                  onClick={() => setConfirmationStatus(visit.id, 'SENT')}
                  className="flex-1 min-w-0 bg-green-100 text-green-700 rounded-lg py-2 text-xs font-semibold text-center"
                >
                  📞 Call
                </a>
              )}
              <button
                onClick={() => setConfirmationStatus(visit.id, 'CONFIRMED')}
                className="flex-1 min-w-0 bg-gray-800 text-white rounded-lg py-2 text-xs font-semibold"
              >
                ✓ Confirmed
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
