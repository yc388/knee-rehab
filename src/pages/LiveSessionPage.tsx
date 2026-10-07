import { useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getExerciseById } from '@/data/exercises';
import { useExerciseSession } from '@/hooks/useExerciseSession';
import { KneeAngleGauge } from '@/components/KneeAngleGauge';
import { AngleChart } from '@/components/AngleChart';
import { MetricTile } from '@/components/MetricTile';
import { saveSession } from '@/services/historyStore';
import { formatClock } from '@/utils/format';
import './LiveSessionPage.css';

/**
 * Live Exercise screen — the core of the app. Shows only the most important
 * live information so the patient isn't overwhelmed: rep counter, knee-angle
 * gauge, a few key metrics, a clear feedback cue and a live angle graph.
 */
export function LiveSessionPage() {
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const navigate = useNavigate();
  const exercise = exerciseId ? getExerciseById(exerciseId) : undefined;

  if (!exercise) {
    return (
      <div className="page">
        <h1>Exercise not found</h1>
        <Link to="/exercises" className="btn btn--primary">
          Back to exercises
        </Link>
      </div>
    );
  }
  return <LiveSession exerciseId={exercise.id} navigate={navigate} />;
}

function LiveSession({
  exerciseId,
  navigate,
}: {
  exerciseId: string;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const exercise = getExerciseById(exerciseId)!;
  const { live, summary, stop } = useExerciseSession(exercise);
  const savedRef = useRef(false);

  // When finished, persist the session and move to results.
  useEffect(() => {
    if (summary && !savedRef.current) {
      savedRef.current = true;
      saveSession(summary);
      navigate(`/results/${summary.id}`, { replace: true });
    }
  }, [summary, navigate]);

  const progress = Math.min(live.reps / exercise.targetReps, 1);
  const { startAngle, targetAngle } = exercise.repConfig;
  const gaugeMin = Math.max(0, Math.min(startAngle, targetAngle) - 20);
  const gaugeMax = Math.max(startAngle, targetAngle) + 20;

  return (
    <div className="page live">
      <div className="live__topbar">
        <div>
          <p className="live__exercise-name">{exercise.icon} {exercise.name}</p>
          <div className="live__reps" aria-live="polite">
            <span className="live__reps-value">
              {live.reps} / {exercise.targetReps}
            </span>
            <span className="live__reps-label">reps</span>
          </div>
          <div className="live__progress" aria-hidden="true">
            <div
              className="live__progress-bar"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
        <div className="live__timer">
          <span className="live__timer-value">{formatClock(live.elapsedMs)}</span>
          <span className="live__timer-label">duration</span>
        </div>
      </div>

      <div className={`live__feedback live__feedback--${feedbackTone(live.status)}`} aria-live="assertive">
        {live.status}
      </div>

      <div className="live__main">
        <div className="card live__gauge-card">
          <KneeAngleGauge
            angle={live.kneeAngle}
            min={gaugeMin}
            max={gaugeMax}
            target={targetAngle}
          />
        </div>

        <div className="live__metrics">
          <MetricTile
            label="Current ROM"
            value={Math.round(live.currentRom)}
            unit="°"
            emphasis
          />
          <MetricTile
            label="Movement speed"
            value={Math.round(Math.abs(live.angularVelocity))}
            unit="°/s"
          />
        </div>
      </div>

      <div className="card live__chart-card">
        <div className="row row--between">
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Knee angle over time</h2>
          <span className="text-muted" style={{ fontSize: '0.95rem' }}>
            last 20 s
          </span>
        </div>
        <AngleChart
          data={live.trace}
          target={targetAngle}
          windowSeconds={20}
          yDomain={[gaugeMin, gaugeMax]}
          height={240}
        />
      </div>

      <button
        className="btn btn--danger btn--block"
        style={{ marginTop: 20 }}
        onClick={stop}
      >
        Finish & see results
      </button>
    </div>
  );
}

function feedbackTone(
  status: string
): 'good' | 'warn' | 'info' {
  if (status === 'Good movement') return 'good';
  if (status === 'Move more slowly') return 'warn';
  return 'info';
}
