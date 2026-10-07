import { EXERCISES } from '@/data/exercises';
import { ExerciseCard } from '@/components/ExerciseCard';
import { useSensor } from '@/services/SensorProvider';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import './ExerciseListPage.css';

/** Lists all available rehabilitation exercises. */
export function ExerciseListPage() {
  const { isConnected, connect, connectionState } = useSensor();

  return (
    <div className="page">
      <h1>Choose an exercise</h1>
      <p className="text-muted">
        Pick a rehabilitation exercise to begin. Each one guides you step by
        step and tracks your movement live.
      </p>

      {!isConnected && (
        <div className="connect-reminder card">
          <div>
            <strong>Your knee brace isn't connected yet.</strong>
            <p className="text-muted" style={{ margin: '4px 0 0' }}>
              You can still explore exercises, but connect the brace to track
              live movement.
            </p>
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

      <div className="grid exercise-grid">
        {EXERCISES.map((exercise) => (
          <ExerciseCard key={exercise.id} exercise={exercise} />
        ))}
      </div>
    </div>
  );
}
