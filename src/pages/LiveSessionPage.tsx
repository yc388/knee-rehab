import { useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getExerciseById } from '@/data/exercises';
import { defaultSessionConfig } from '@/types/exercise';
import { usePlatform } from '@/services/PlatformProvider';
import { useExerciseSession } from '@/hooks/useExerciseSession';
import { loadSessionConfig } from '@/services/sessionConfigStore';
import { KneeFigure } from '@/components/KneeFigure';
import { AngleChart } from '@/components/AngleChart';
import { MetricTile } from '@/components/MetricTile';
import { AiAnalysisPanel } from '@/components/AiAnalysisPanel';
import { InfraStatusBadge } from '@/components/InfraStatusBadge';
import { LatencyComparisonPanel } from '@/components/LatencyComparisonPanel';
import { saveSession } from '@/services/historyStore';
import { formatClock } from '@/utils/format';
import type { InferenceMode } from '@/types/analysis';
import './LiveSessionPage.css';

/** Live Exercise session — overview, live monitoring, edge-AI analysis, controls. */
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
  const config = useMemo(
    () => loadSessionConfig(exerciseId) ?? defaultSessionConfig(exercise),
    [exerciseId, exercise]
  );

  const {
    inferenceMode,
    setInferenceMode,
    activeInference,
    infrastructure,
    connectionLabel,
  } = usePlatformExtras();

  const { state, summary, start, pause, resume, end, reset, isConnected } =
    useExerciseSession(exercise, config);
  const savedRef = useRef(false);

  // Persist + navigate to results when finished.
  useEffect(() => {
    if (summary && !savedRef.current) {
      savedRef.current = true;
      saveSession(summary);
      navigate(`/results/${summary.id}`, { replace: true });
    }
  }, [summary, navigate]);

  const { analysis } = state;
  const progress = Math.min(analysis.reps / config.targetReps, 1);
  const { startAngle } = exercise.repConfig;
  const target = config.targetAngle;
  const gMin = Math.max(0, Math.min(startAngle, target) - 20);
  const gMax = Math.max(startAngle, target) + 20;

  const running = state.status === 'running';
  const paused = state.status === 'paused';
  const idle = state.status === 'idle';

  return (
    <div className="page live">
      {/* Overview + controls bar */}
      <div className="live__topbar">
        <div className="live__overview">
          <p className="live__exercise-name">
            {exercise.icon} {exercise.name}
          </p>
          <div className="live__reps" aria-live="polite">
            <span className="live__reps-value">
              {analysis.reps} / {config.targetReps}
            </span>
            <span className="live__reps-label">reps · target {target}°</span>
          </div>
          <div className="live__progress" aria-hidden="true">
            <div
              className="live__progress-bar"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
        <div className="live__timer">
          <span className="live__timer-value">{formatClock(state.elapsedMs)}</span>
          <span className="live__timer-label">duration</span>
        </div>
      </div>

      {/* Processing mode toggle + infra */}
      <div className="live__modebar card">
        <div className="live__modetoggle" role="tablist" aria-label="Processing mode">
          {(['edge', 'cloud'] as InferenceMode[]).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={inferenceMode === m}
              className={inferenceMode === m ? 'is-active' : ''}
              onClick={() => setInferenceMode(m)}
              disabled={running}
            >
              {m === 'edge' ? '🖥️ Local Edge' : '☁️ Cloud'}
            </button>
          ))}
        </div>
        <InfraStatusBadge status={infrastructure} />
        <span className="live__method">{activeInference.describe()}</span>
      </div>

      {!isConnected && idle && (
        <div className="card live__notconnected">
          <strong>No brace connected.</strong> Connect a brace or choose
          Simulation before starting.{' '}
          <Link to="/connect">Go to Connect →</Link>
        </div>
      )}

      <div className="live__main">
        {/* Left: live monitoring */}
        <div className="card live__monitor">
          <KneeFigure angle={state.kneeAngle} target={target} />
          <div className="live__angle">
            <span className="live__angle-value">
              {Math.round(state.kneeAngle)}°
            </span>
            <span className="live__angle-label">Knee angle</span>
          </div>
          <div className="live__smallmetrics">
            <MetricTile
              label="Current ROM"
              value={Math.round(analysis.currentRom)}
              unit="°"
              emphasis
            />
            <MetricTile
              label="Speed"
              value={Math.round(analysis.speed)}
              unit="°/s"
            />
          </div>
        </div>

        {/* Right: edge AI analysis */}
        <AiAnalysisPanel
          analysis={analysis}
          timing={state.timing}
          methodLabel={activeInference.describe()}
          isTrainedModel={false}
        />
      </div>

      {/* Live graph */}
      <div className="card live__chart-card">
        <div className="row row--between">
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Knee angle over time</h2>
          <span className="text-muted" style={{ fontSize: '0.95rem' }}>
            last 20 s
          </span>
        </div>
        <AngleChart
          data={state.trace}
          target={target}
          windowSeconds={20}
          yDomain={[gMin, gMax]}
          height={240}
        />
      </div>

      {/* Latency comparison */}
      <div style={{ marginTop: 20 }}>
        <LatencyComparisonPanel
          edge={state.edgeStats}
          cloud={state.cloudStats}
          activeLocation={state.timing?.location ?? infrastructure}
          connectionLabel={connectionLabel}
        />
      </div>

      {/* Session controls */}
      <div className="live__controls">
        {idle && (
          <button
            className="btn btn--primary btn--xl"
            onClick={start}
            disabled={!isConnected}
          >
            ▶ Start Exercise
          </button>
        )}
        {running && (
          <button className="btn btn--secondary btn--xl" onClick={pause}>
            ⏸ Pause
          </button>
        )}
        {paused && (
          <button className="btn btn--primary btn--xl" onClick={resume}>
            ▶ Resume
          </button>
        )}
        {(running || paused) && (
          <button className="btn btn--danger btn--xl" onClick={end}>
            ⏹ End Exercise
          </button>
        )}
        {(running || paused || state.trace.length > 0) && (
          <button className="btn btn--ghost btn--xl" onClick={reset}>
            ↺ Reset Session
          </button>
        )}
      </div>

      <p className="text-muted text-center" style={{ fontSize: '0.9rem' }}>
        Analysis is {activeInference.simulated ? 'simulated' : 'measured'} ·
        feedback is derived from live knee-angle data only (no posture or
        balance inference). · {connectionLabel}
      </p>
    </div>
  );
}

/** Small helper to pull the extra platform fields the page needs. */
function usePlatformExtras() {
  const p = usePlatform();
  const connectionLabel =
    p.connectionState === 'connected'
      ? `${p.sensorMode} connected`
      : p.connectionState;
  return {
    inferenceMode: p.inferenceMode,
    setInferenceMode: p.setInferenceMode,
    activeInference: p.activeInference,
    infrastructure: p.infrastructure,
    connectionLabel,
  };
}
