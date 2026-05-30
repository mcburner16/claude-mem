import { HashRouter, Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar';
import DemoBanner from './components/DemoBanner';
import { ToastProvider } from './components/Toast';
import HomePage from './pages/HomePage';
import IntakePage from './pages/IntakePage';
import TriageResultPage from './pages/TriageResultPage';
import DashboardPage from './pages/DashboardPage';
import AuditPreviewPage from './pages/AuditPreviewPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <div className="min-h-screen bg-bg text-textPrimary">
          <NavBar />
          <DemoBanner />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/intake" element={<IntakePage />} />
            <Route path="/triage/:id" element={<TriageResultPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/audit-preview" element={<AuditPreviewPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </div>
      </ToastProvider>
    </HashRouter>
  );
}
