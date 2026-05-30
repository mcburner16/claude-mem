import { useNavigate } from 'react-router-dom';
import { resetToDemo } from '../store';

export default function DemoBanner() {
  const navigate = useNavigate();

  function handleReset() {
    resetToDemo();
    navigate('/dashboard');
    window.location.reload();
  }

  return (
    <div className="bg-surface border-b border-gray-700 px-4 py-2">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-textSecondary">
          🎬 <span className="text-textPrimary">Demo Mode</span>
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigate('/triage/demo-3')}
            className="text-xs px-3 py-1 rounded border border-accent text-accent hover:bg-accent/10 transition-colors"
          >
            Load AC Outage Demo
          </button>
          <button
            onClick={() => navigate('/triage/demo-1')}
            className="text-xs px-3 py-1 rounded border border-accent text-accent hover:bg-accent/10 transition-colors"
          >
            Load Leaking Sink Demo
          </button>
          <button
            onClick={handleReset}
            className="text-xs px-3 py-1 rounded border border-gray-600 text-textSecondary hover:bg-gray-700 transition-colors"
          >
            Reset Demo Data
          </button>
        </div>
      </div>
    </div>
  );
}
