import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getSessionById } from '@/services/historyStore';
import { SessionSummaryView } from '@/components/SessionSummaryView';
import { WeightRecommendationCard } from '@/components/WeightRecommendationCard';
import { usePlatform } from '@/services/PlatformProvider';
import {
  getContext,
  setContext,
  addWeightSetting,
} from '@/services/rehab/rehabStore';
import { clampWeight } from '@/types/rehab';
import './ResultsPage.css';

/** Exercise completion / results screen with full summary, graph and the
 *  AI-assisted resistance review. */
export function ResultsPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { canReview } = usePlatform();
  const session = sessionId ? getSessionById(sessionId) : undefined;
  const [ctx, setCtx] = useState(() =>
    sessionId ? getContext(sessionId) : undefined
  );

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
  const rec = ctx?.recommendation ?? null;

  const review = (status: 'approved' | 'rejected') => {
    if (!ctx || !rec || !sessionId) return;
    const updatedRec = { ...rec, status, provenance: 'clinician-approved' as const };
    const updatedCtx = { ...ctx, recommendation: updatedRec };
    setContext(sessionId, updatedCtx);
    setCtx(updatedCtx);
    // On approval of a proposed increase, record it as the new approved weight.
    if (status === 'approved' && updatedRec.proposedKg !== null) {
      addWeightSetting({
        kg: clampWeight(updatedRec.proposedKg),
        status: 'approved',
        effectiveAt: new Date().toISOString(),
        provenance: 'clinician-approved',
        note: 'Approved from post-session recommendation',
      });
    }
  };

  return (
    <div className="page">
      <div className="results-hero text-center">
        <div className="results-hero__check" aria-hidden="true">
          {completed ? '🎉' : '✅'}
        </div>
        <h1>{completed ? 'Exercise Complete!' : 'Session Saved'}</h1>
        <p className="text-muted">
          {session.exerciseName}
          {ctx && ` · brace setting ${ctx.weightKg.toFixed(1)} kg`}
        </p>
      </div>

      {rec && (
        <div style={{ marginBottom: 28 }}>
          <WeightRecommendationCard
            rec={rec}
            canReview={canReview}
            onApprove={() => review('approved')}
            onReject={() => review('rejected')}
          />
          {ctx?.report && (
            <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: 10 }}>
              Patient-reported: difficulty <strong>{ctx.report.difficulty.replace('-', ' ')}</strong>,
              pain <strong>{ctx.report.pain}/10</strong>, discomfort{' '}
              <strong>{ctx.report.discomfort ? 'yes' : 'no'}</strong>.
            </p>
          )}
        </div>
      )}

      <SessionSummaryView session={session} />

      <div className="results-actions">
        <button className="btn btn--secondary" onClick={() => navigate('/')}>
          Return to Dashboard
        </button>
        <button className="btn btn--primary" onClick={() => navigate('/calendar')}>
          View Schedule
        </button>
        <button
          className="btn btn--ghost"
          onClick={() => navigate(`/exercise/${session.exerciseId}`)}
        >
          Repeat Exercise
        </button>
      </div>

      <p className="disclaimer">
        These figures are for rehabilitation monitoring only and do not
        constitute medical advice. Approving a recommendation updates the planned
        app setting only — it does not change the physical brace.
      </p>
    </div>
  );
}
