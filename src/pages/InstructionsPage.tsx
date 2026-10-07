import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getExerciseById } from '@/data/exercises';
import { DifficultyBadge } from '@/components/DifficultyBadge';
import { useSensor } from '@/services/SensorProvider';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { formatDuration } from '@/utils/format';
import './InstructionsPage.css';

/** Shows how to perform the exercise, with a 3-second countdown to start. */
export function InstructionsPage() {
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const navigate = useNavigate();
  const { isConnected, connect, connectionState } = useSensor();
  const exercise = exerciseId ? getExerciseById(exerciseId) : undefined;

  const [countdown, setCountdown] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

      <div className="illustration-placeholder" aria-hidden="true">
        <span className="illustration-placeholder__icon">{exercise.icon}</span>
        <span className="illustration-placeholder__caption">
          Animation / illustration placeholder
        </span>
      </div>

      <section className="card instructions-steps">
        <h2>How to perform it</h2>
        <ol>
          {exercise.steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
        <div className="instructions-target">
          🎯 Target: <strong>{exercise.targetReps} repetitions</strong>
          <span className="text-muted">
            {' '}
            · about {formatDuration(exercise.estimatedSeconds * 1000)}
          </span>
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
            <button
              className="btn btn--primary"
              onClick={() => connect()}
              disabled={connectionState === 'connecting'}
            >
              {connectionState === 'connecting'
                ? 'Connecting…'
                : 'Connect Knee Brace'}
            </button>
          </div>
        </div>
      )}

      <button
        className="btn btn--primary btn--xl btn--block"
        style={{ marginTop: 28 }}
        onClick={beginCountdown}
        disabled={countdown !== null}
      >
        {countdown !== null ? 'Get ready…' : 'Start Exercise'}
      </button>

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
