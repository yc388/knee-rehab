import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getExerciseById } from '@/data/exercises';
import { defaultSessionConfig } from '@/types/exercise';
import { DifficultyBadge } from '@/components/DifficultyBadge';
import { usePlatform } from '@/services/PlatformProvider';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { KneeFigure } from '@/components/KneeFigure';
import { formatDuration } from '@/utils/format';
import { saveSessionConfig } from '@/services/sessionConfigStore';
import './InstructionsPage.css';

/** Shows how to perform the exercise, lets the user configure targets, then a
 *  3-second countdown to the live session. */
export function InstructionsPage() {
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const navigate = useNavigate();
  const { isConnected, connectionState } = usePlatform();
  const exercise = exerciseId ? getExerciseById(exerciseId) : undefined;

  const [countdown, setCountdown] = useState<number | null>(null);
  const [targetReps, setTargetReps] = useState<number>(
    exercise?.targetReps ?? 10
  );
  const [targetAngle, setTargetAngle] = useState<number>(
    exercise?.repConfig.targetAngle ?? 20
  );
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (exercise) {
      const d = defaultSessionConfig(exercise);
      setTargetReps(d.targetReps);
      setTargetAngle(d.targetAngle);
    }
  }, [exercise]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!exercise) {
    return (
      <div className="page page--narrow">
        <h1>Exercise not found</h1>
        <Link to="/exercises" className="btn btn--primary">
          Back to exercises
        </Link>
      </div>
    );
  }

  const beginCountdown = () => {
    saveSessionConfig(exercise.id, { targetReps, targetAngle });
    setCountdown(3);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          navigate(`/session/${exercise.id}`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const flexion = exercise.direction === 'flexion';
  const angleMin = Math.min(exercise.repConfig.startAngle, 5);
  const angleMax = Math.max(exercise.repConfig.startAngle, 130);

  return (
    <div className="page page--narrow">
      <Link to="/exercises" className="back-link">
        ← All exercises
      </Link>

      <div className="instructions-head">
        <span className="instructions-head__icon" aria-hidden="true">
          {exercise.icon}
        </span>
        <div>
          <h1 style={{ marginBottom: 6 }}>{exercise.name}</h1>
          <DifficultyBadge level={exercise.difficulty} />
        </div>
      </div>

      <p className="instructions-lead">{exercise.longDescription}</p>

      <div className="illustration-wrap">
        <KneeFigure angle={targetAngle} target={exercise.repConfig.startAngle} />
        <span className="illustration-caption">
          Target position preview · teal = target, grey = start
        </span>
      </div>

      <section className="card instructions-steps">
        <h2>How to perform it</h2>
        <ol>
          {exercise.steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </section>

      <section className="card config-card">
        <h2>Set your targets</h2>
        <p className="text-muted" style={{ marginTop: 0 }}>
          Targets are configurable — one rehab goal is not right for every
          patient. Adjust to what your clinician recommends.
        </p>
        <div className="config-row">
          <label className="config-field">
            <span>Target repetitions: {targetReps}</span>
            <input
              type="range"
              min={3}
              max={20}
              value={targetReps}
              onChange={(e) => setTargetReps(Number(e.target.value))}
            />
          </label>
          <label className="config-field">
            <span>
              Target knee angle: {targetAngle}° ({flexion ? 'flexion' : 'extension'})
            </span>
            <input
              type="range"
              min={angleMin}
              max={angleMax}
              value={targetAngle}
              onChange={(e) => setTargetAngle(Number(e.target.value))}
            />
          </label>
        </div>
      </section>

      <div className="safety-note" role="note">
        <span aria-hidden="true">⚠️</span>
        <div>
          <strong>Safety reminder</strong>
          <p style={{ margin: '2px 0 0' }}>{exercise.safetyReminder}</p>
        </div>
      </div>

      {!isConnected && (
        <div className="card connect-reminder" style={{ marginTop: 20 }}>
          <div>
            <strong>Connect your knee brace to track this exercise.</strong>
          </div>
          <div className="row row--wrap">
            <ConnectionStatus state={connectionState} />
            <button className="btn btn--primary" onClick={() => navigate('/connect')}>
              Connect Knee Brace
            </button>
          </div>
        </div>
      )}

      <button
        className="btn btn--primary btn--xl btn--block"
        style={{ marginTop: 28 }}
        onClick={beginCountdown}
        disabled={countdown !== null || !isConnected}
      >
        {!isConnected
          ? 'Connect a brace to start'
          : countdown !== null
            ? 'Get ready…'
            : 'Start Exercise'}
      </button>
      <p className="text-muted text-center" style={{ marginTop: 8, marginBottom: 0 }}>
        Estimated {formatDuration(exercise.estimatedSeconds * 1000)}
      </p>

      {countdown !== null && (
        <div
          className="countdown-overlay"
          role="alertdialog"
          aria-label={`Starting in ${countdown}`}
        >
          <div className="countdown-overlay__content">
            <p className="countdown-overlay__label">Get ready</p>
            <div className="countdown-overlay__number" key={countdown}>
              {countdown}
            </div>
            <p className="text-muted">{exercise.name}</p>
          </div>
        </div>
      )}
    </div>
  );
}
