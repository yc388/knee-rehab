import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SensorProvider } from '@/services/SensorProvider';
import { AppHeader } from '@/components/AppHeader';
import { DashboardPage } from '@/pages/DashboardPage';
import { ExerciseListPage } from '@/pages/ExerciseListPage';
import { InstructionsPage } from '@/pages/InstructionsPage';
import { LiveSessionPage } from '@/pages/LiveSessionPage';
import { ResultsPage } from '@/pages/ResultsPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { HistoryDetailPage } from '@/pages/HistoryDetailPage';

/**
 * Application root. Wires the sensor service provider and the route map that
 * drives the main user flow:
 *
 *   Dashboard → Exercises → Instructions → Live Session → Results → History
 */
export default function App() {
  return (
    <SensorProvider>
      <BrowserRouter>
        <div className="app-shell">
          <AppHeader />
          <main>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/exercises" element={<ExerciseListPage />} />
              <Route path="/exercise/:exerciseId" element={<InstructionsPage />} />
              <Route path="/session/:exerciseId" element={<LiveSessionPage />} />
              <Route path="/results/:sessionId" element={<ResultsPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/history/:sessionId" element={<HistoryDetailPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </SensorProvider>
  );
}
