import { useEffect, useRef } from 'react';
import { useStore } from './store';
import { format, parseISO, startOfWeek, addDays } from 'date-fns';
import WeekView from './components/WeekView';
import DayView from './components/DayView';
import PatientList from './components/PatientList';
import ConfirmationQueue from './components/ConfirmationQueue';
import Settings from './components/Settings';
import NewWeekSetup from './components/NewWeekSetup';
import SuggestionPanel from './components/SuggestionPanel';
import PaycheckView from './components/PaycheckView';

const TAB_ICONS: Record<string, string> = {
  week: '📅',
  day: '📋',
  patients: '👥',
  confirmations: '✓',
  paycheck: '$',
  settings: '⚙',
};

export default function App() {
  const {
    currentView,
    setView,
    currentWeekId,
    weeks,
    schedulingStartTime,
    endSchedulingSession,
    seedIfEmpty,
    setView: navigate,
  } = useStore();

  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    seedIfEmpty();
  }, []);

  // Check if we need to show new week setup
  useEffect(() => {
    if (currentWeekId === null) {
      setView('newWeek');
      return;
    }
    // Also check if current real week is missing
    const today = new Date();
    const monday = startOfWeek(today, { weekStartsOn: 1 });
    const currentWeekStart = format(monday, 'yyyy-MM-dd');
    const hasCurrentWeek = weeks.some((w) => w.startDate === currentWeekStart);
    if (!hasCurrentWeek && weeks.length > 0 && currentView !== 'newWeek') {
      // Show new week prompt only once per session
      // For now, let user navigate manually
    }
  }, [currentWeekId, weeks.length]);

  // Scheduling inactivity timer
  const resetInactivityTimer = () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      endSchedulingSession();
    }, 5 * 60 * 1000); // 5 minutes
  };

  useEffect(() => {
    if (schedulingStartTime) {
      resetInactivityTimer();
    }
  }, [schedulingStartTime]);

  const currentWeek = weeks.find((w) => w.id === currentWeekId);
  const weekLabel = currentWeek
    ? (() => {
        const dates = Array.from({ length: 7 }, (_, i) =>
          addDays(parseISO(currentWeek.startDate), i)
        );
        return `${format(dates[0], 'MMM d')} – ${format(dates[6], 'MMM d, yyyy')}`;
      })()
    : 'No Week Selected';

  const renderView = () => {
    switch (currentView) {
      case 'week':
        return <WeekView />;
      case 'day':
        return <DayView />;
      case 'patients':
        return <PatientList />;
      case 'confirmations':
        return <ConfirmationQueue />;
      case 'settings':
        return <Settings />;
      case 'newWeek':
        return <NewWeekSetup />;
      case 'suggestions':
        return <SuggestionPanel />;
      case 'paycheck':
        return <PaycheckView />;
      default:
        return <WeekView />;
    }
  };

  const mainTabs = ['week', 'day', 'patients', 'confirmations', 'paycheck', 'settings'] as const;
  const tabLabels: Record<string, string> = {
    week: 'Week',
    day: 'Day',
    patients: 'Patients',
    confirmations: 'Queue',
    paycheck: 'Pay',
    settings: 'Settings',
  };

  const isHiddenView = currentView === 'newWeek' || currentView === 'suggestions';

  return (
    <div className="flex flex-col h-screen bg-gray-50 max-w-lg mx-auto relative">
      {/* Top Bar */}
      <header className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between shadow-md flex-shrink-0">
        <div>
          <div className="text-xs text-blue-200 uppercase tracking-wide font-medium">HH Scheduler</div>
          <div className="text-sm font-semibold">{weekLabel}</div>
        </div>
        <div className="flex items-center gap-2">
          {schedulingStartTime && (
            <div className="flex items-center gap-1 bg-blue-500 rounded-full px-2 py-1">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span className="text-xs text-white">Scheduling</span>
            </div>
          )}
          <button
            onClick={() => navigate('newWeek')}
            className="text-xs bg-blue-500 hover:bg-blue-400 rounded-lg px-2 py-1"
          >
            New Week
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {renderView()}
      </main>

      {/* Bottom Tab Bar */}
      {!isHiddenView && (
        <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-gray-200 safe-bottom z-50">
          <div className="flex">
            {mainTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setView(tab)}
                className={`flex-1 flex flex-col items-center py-2 px-1 min-h-[56px] ${
                  currentView === tab
                    ? 'text-blue-600'
                    : 'text-gray-500'
                }`}
              >
                <span className="text-lg">{TAB_ICONS[tab]}</span>
                <span className="text-xs mt-0.5 font-medium">{tabLabels[tab]}</span>
              </button>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
