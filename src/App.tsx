import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PlatformProvider } from '@/services/PlatformProvider';
import { AppHeader } from '@/components/AppHeader';
import { DashboardPage } from '@/pages/DashboardPage';
import { ConnectPage } from '@/pages/ConnectPage';
import { ExerciseListPage } from '@/pages/ExerciseListPage';
import { InstructionsPage } from '@/pages/InstructionsPage';
import { LiveSessionPage } from '@/pages/LiveSessionPage';
import { ResultsPage } from '@/pages/ResultsPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { HistoryDetailPage } from '@/pages/HistoryDetailPage';
import { AiRanPage } from '@/pages/AiRanPage';

/**
 * Application root. Wires the platform provider (sensor source + inference
 * backend + infrastructure status) and the route map:
 *
 *   Dashboard → Connect → Exercises → Instructions → Live Session → Results
 *   plus Exercise History and the AI-RAN & Edge Intelligence dashboard.
 */
export default function App() {
  return (
    <PlatformProvider>
      <BrowserRouter>
        <div className="app-shell">
          <AppHeader />
          <main>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/connect" element={<ConnectPage />} />
              <Route path="/exercises" element={<ExerciseListPage />} />
              <Route path="/exercise/:exerciseId" element={<InstructionsPage />} />
              <Route path="/session/:exerciseId" element={<LiveSessionPage />} />
              <Route path="/results/:sessionId" element={<ResultsPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/history/:sessionId" element={<HistoryDetailPage />} />
              <Route path="/ai-ran" element={<AiRanPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </PlatformProvider>
  );
}
