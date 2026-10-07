import { useNavigate, useParams, Link } from 'react-router-dom';
import { getSessionById } from '@/services/historyStore';
import { SessionSummaryView } from '@/components/SessionSummaryView';
import './ResultsPage.css';

/** Exercise completion / results screen with full summary and session graph. */
export function ResultsPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const session = sessionId ? getSessionById(sessionId) : undefined;

  if (!session) {
    return (
      <div className="page page--narrow">
        <h1>Session not found</h1>
        <Link to="/" className="btn btn--primary">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const completed = session.repsCompleted >= session.targetReps;

  return (
    <div className="page">
      <div className="results-hero text-center">
        <div className="results-hero__check" aria-hidden="true">
          {completed ? '🎉' : '✅'}
        </div>
        <h1>{completed ? 'Exercise Complete!' : 'Session Saved'}</h1>
        <p className="text-muted">{session.exerciseName}</p>
      </div>

      <SessionSummaryView session={session} />

      <div className="results-actions">
        <button className="btn btn--secondary" onClick={() => navigate('/')}>
          Return to Dashboard
        </button>
        <button
          className="btn btn--primary"
          onClick={() => navigate(`/exercise/${session.exerciseId}`)}
        >
          Repeat Exercise
        </button>
        <button className="btn btn--ghost" onClick={() => navigate('/exercises')}>
          Choose Another Exercise
        </button>
      </div>

      <p className="disclaimer">
        These figures are for rehabilitation monitoring only and do not
        constitute medical advice.
      </p>
    </div>
  );
}
