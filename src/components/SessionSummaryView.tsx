import { AngleChart } from '@/components/AngleChart';
import { MetricTile } from '@/components/MetricTile';
import { ScoreRing } from '@/components/ScoreRing';
import type { SessionSummary } from '@/types/exercise';
import { formatDuration } from '@/utils/format';
import '@/pages/ResultsPage.css';

interface Props {
  session: SessionSummary;
}

/**
 * Shared rendering of a session summary (score, metrics, feedback, graph).
 * Used by both the post-exercise Results screen and the History detail screen.
 */
export function SessionSummaryView({ session }: Props) {
  const angles = session.angleTrace.map((s) => s.angle);
  const yMin = angles.length ? Math.min(...angles) - 10 : 0;
  const yMax = angles.length ? Math.max(...angles) + 10 : 130;

  return (
    <>
      <div className="results-top">
        <div className="card results-score">
          <ScoreRing score={session.overallScore} />
          <div className="results-score__caption">Overall Score</div>
        </div>

        <div className="results-headline">
          <MetricTile
            label="Repetitions completed"
            value={`${session.repsCompleted} / ${session.targetReps}`}
            icon="🔁"
            emphasis
          />
          <MetricTile
            label="Exercise duration"
            value={formatDuration(session.durationMs)}
            icon="⏱️"
          />
          <MetricTile
            label="Consistency score"
            value={session.consistencyScore}
            unit="%"
            icon="🎯"
          />
        </div>
      </div>

      <h2 className="section-title">Movement summary</h2>
      <div className="grid results-grid">
        <MetricTile label="Maximum knee flexion" value={Math.round(session.maxFlexion)} unit="°" />
        <MetricTile label="Maximum knee extension" value={Math.round(session.maxExtension)} unit="°" />
        <MetricTile label="Total range of motion" value={Math.round(session.totalRangeOfMotion)} unit="°" />
        <MetricTile label="Average movement speed" value={Math.round(session.averageSpeed)} unit="°/s" />
      </div>

      <div className="card results-feedback">
        <div className="results-feedback__item">
          <span aria-hidden="true">💬</span>
          <p>{session.feedback}</p>
        </div>
        <div className="results-feedback__item results-feedback__item--improve">
          <span aria-hidden="true">🚀</span>
          <p>{session.improvement}</p>
        </div>
      </div>

      <h2 className="section-title">Session graph</h2>
      <div className="card">
        <AngleChart data={session.angleTrace} height={300} yDomain={[yMin, yMax]} />
      </div>
    </>
  );
}
