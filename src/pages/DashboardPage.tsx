import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSensor } from '@/services/SensorProvider';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { MetricTile } from '@/components/MetricTile';
import { getSessions } from '@/services/historyStore';
import { formatDuration, formatShortDate } from '@/utils/format';
import './DashboardPage.css';

/** Home dashboard: connection, today's progress, recent sessions, start CTA. */
export function DashboardPage() {
  const { connectionState, isConnected, connect } = useSensor();
  const navigate = useNavigate();
  const connecting = connectionState === 'connecting';

  const sessions = useMemo(() => getSessions(), []);

  const today = useMemo(() => {
    const now = new Date();
    const todays = sessions.filter((s) => {
      const d = new Date(s.completedAt);
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    });
    const totalMs = todays.reduce((sum, s) => sum + s.durationMs, 0);
    return { count: todays.length, totalMs };
  }, [sessions]);

  const recent = sessions.slice(0, 4);

  return (
    <div className="page">
      <section className="dashboard-hero card card--pad-lg">
        <div className="dashboard-hero__text">
          <p className="dashboard-hero__eyebrow">Welcome back</p>
          <h1>Let's work on your knee today</h1>
          <p className="text-muted">
            A calm, guided way to track your rehabilitation exercises with your
            smart knee brace.
          </p>
          <div className="row row--wrap" style={{ marginTop: 8 }}>
            <ConnectionStatus state={connectionState} />
          </div>
        </div>
        <div className="dashboard-hero__actions">
          <button
            className="btn btn--primary btn--xl btn--block"
            onClick={() => connect()}
            disabled={isConnected || connecting}
          >
            {isConnected
              ? '✓ Brace Connected'
              : connecting
                ? 'Connecting…'
                : '🔗 Connect Knee Brace'}
          </button>
          <button
            className="btn btn--secondary btn--xl btn--block"
            onClick={() => navigate('/exercises')}
          >
            ▶ Start Exercise
          </button>
        </div>
      </section>

      <h2 className="section-title">Today's progress</h2>
      <div className="grid dashboard-stats">
        <MetricTile
          label="Exercises completed"
          value={today.count}
          icon="✅"
        />
        <MetricTile
          label="Total exercise time"
          value={today.totalMs > 0 ? formatDuration(today.totalMs) : '0 sec'}
          icon="⏱️"
        />
        <MetricTile
          label="All-time sessions"
          value={sessions.length}
          icon="📈"
        />
      </div>

      <div className="row row--between" style={{ marginTop: 36 }}>
        <h2 className="section-title" style={{ margin: 0 }}>
          Recent sessions
        </h2>
        <Link to="/history" className="btn btn--ghost">
          View all
        </Link>
      </div>

      {recent.length === 0 ? (
        <div className="card text-center text-muted" style={{ marginTop: 16 }}>
          No sessions yet. Complete an exercise to see it here.
        </div>
      ) : (
        <ul className="recent-list">
          {recent.map((s) => (
            <li key={s.id}>
              <Link to={`/history/${s.id}`} className="recent-item">
                <span className="recent-item__date">
                  {formatShortDate(s.completedAt)}
                </span>
                <span className="recent-item__name">{s.exerciseName}</span>
                <span className="recent-item__reps">
                  {s.repsCompleted}/{s.targetReps} reps
                </span>
                <span className="recent-item__score">{s.overallScore}/100</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="disclaimer">
        ReHabKnee is a rehabilitation exercise monitoring prototype. It does not
        provide medical diagnosis or advice. Always follow the guidance of your
        physiotherapist or clinician.
      </p>
    </div>
  );
}
