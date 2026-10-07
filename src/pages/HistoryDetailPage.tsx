import { useNavigate, useParams, Link } from 'react-router-dom';
import { getSessionById } from '@/services/historyStore';
import { SessionSummaryView } from '@/components/SessionSummaryView';
import { formatDateTime } from '@/utils/format';
import './ResultsPage.css';

/** Detailed statistics for a single previously-recorded session. */
export function HistoryDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const session = sessionId ? getSessionById(sessionId) : undefined;

  if (!session) {
    return (
      <div className="page page--narrow">
        <h1>Session not found</h1>
        <Link to="/history" className="btn btn--primary">
          Back to history
        </Link>
      </div>
    );
  }

  return (
    <div className="page">
      <Link to="/history" className="back-link">
        ← All history
      </Link>

      <div className="results-hero">
        <h1 style={{ marginBottom: 4 }}>{session.exerciseName}</h1>
        <p className="text-muted">{formatDateTime(session.completedAt)}</p>
      </div>

      <SessionSummaryView session={session} />

      <div className="results-actions">
        <button className="btn btn--secondary" onClick={() => navigate('/history')}>
          Back to History
        </button>
        <button
          className="btn btn--primary"
          onClick={() => navigate(`/exercise/${session.exerciseId}`)}
        >
          Do this exercise again
        </button>
      </div>
    </div>
  );
}
