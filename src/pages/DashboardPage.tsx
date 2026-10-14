import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePlatform } from '@/services/PlatformProvider';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { InfraStatusBadge } from '@/components/InfraStatusBadge';
import { getSessions } from '@/services/historyStore';
import {
  getSchedule,
  getCurrentApprovedWeight,
  getRecommendations,
} from '@/services/rehab/rehabStore';
import { generateWeeklyReport, weekStartOf } from '@/services/rehab/weeklyAnalysis';
import { saveSessionConfig, saveScheduledLink } from '@/services/sessionConfigStore';
import './DashboardPage.css';

/** Home dashboard with the smart-rehab sections, all from shared data. */
export function DashboardPage() {
  const { connectionState, isConnected, infrastructure, inferenceMode } =
    usePlatform();
  const navigate = useNavigate();

  const sessions = useMemo(() => getSessions(), []);
  const schedule = useMemo(() => getSchedule(), []);
  const weight = useMemo(() => getCurrentApprovedWeight(), []);
  const latestRec = useMemo(() => {
    const r = getRecommendations();
    return r[r.length - 1] ?? null;
  }, []);

  const now = new Date();
  const todays = schedule.filter(
    (s) => sameDay(new Date(s.dateTime), now) && s.status !== 'rest'
  );
  const next = [...schedule]
    .filter((s) => s.status === 'upcoming' && new Date(s.dateTime) >= now)
    .sort((a, b) => +new Date(a.dateTime) - +new Date(b.dateTime))[0];

  const weekStart = weekStartOf(now);
  const report = useMemo(
    () =>
      generateWeeklyReport({
        weekStart,
        sessions,
        schedule,
        currentWeightKg: weight.kg,
        painThisWeek: null,
        painPrevWeek: null,
      }),
    [weekStart, sessions, schedule, weight]
  );

  const recent = sessions[0];
  const completionRate =
    recent && recent.targetReps > 0
      ? Math.round((recent.goodReps / recent.targetReps) * 100)
      : 0;

  const launch = (exerciseId: string, reps: number, targetAngle: number, schedId?: string) => {
    saveSessionConfig(exerciseId, { targetReps: reps, targetAngle });
    if (schedId) saveScheduledLink(exerciseId, schedId);
    navigate(`/exercise/${exerciseId}`);
  };

  return (
    <div className="page">
      <section className="dashboard-hero card card--pad-lg">
        <div className="dashboard-hero__text">
          <p className="dashboard-hero__eyebrow">Welcome back</p>
          <h1>Your rehabilitation, intelligently monitored</h1>
          <div className="row row--wrap" style={{ marginTop: 8 }}>
            <ConnectionStatus state={connectionState} />
            <InfraStatusBadge status={infrastructure} />
          </div>
        </div>
        <div className="dashboard-hero__actions">
          <button className="btn btn--primary btn--xl btn--block" onClick={() => navigate('/connect')}>
            {isConnected ? '✓ Brace Connected · Manage' : '🔗 Connect Knee Brace'}
          </button>
          <button className="btn btn--secondary btn--xl btn--block" onClick={() => navigate('/exercises')}>
            ▶ Start Exercise
          </button>
        </div>
      </section>

      <div className="dash-grid">
        {/* My Rehabilitation Today */}
        <section className="card dash-card">
          <h2>🗓️ My Rehabilitation Today</h2>
          {todays.length === 0 ? (
            <p className="text-muted">No sessions scheduled today.</p>
          ) : (
            <ul className="dash-today">
              {todays.map((s) => (
                <li key={s.id}>
                  <div>
                    <strong>{s.exerciseName}</strong>
                    <span className="text-muted">
                      {' '}· {s.reps}×{s.sets} · {s.plannedWeightKg.toFixed(1)} kg
                    </span>
                  </div>
                  {s.status === 'completed' ? (
                    <span className="pill pill--done">✓ done</span>
                  ) : (
                    <button className="btn btn--secondary" onClick={() => launch(s.exerciseId, s.reps, s.targetAngle, s.id)}>
                      Start
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="dash-weight">
            Current approved brace weight: <strong>{weight.kg.toFixed(1)} kg</strong>
            {weight.status === 'pending' && (
              <span className="pill pill--pending"> pending approval</span>
            )}
          </p>
          {next && (
            <p className="text-muted">
              Next: {next.exerciseName} ·{' '}
              {new Date(next.dateTime).toLocaleDateString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </section>

        {/* Weekly Schedule compact */}
        <section className="card dash-card">
          <div className="row row--between">
            <h2>📅 Weekly Schedule</h2>
            <Link to="/calendar" className="dash-link">Full calendar →</Link>
          </div>
          <WeekStrip schedule={schedule} />
          <p className="text-muted">
            {report.sessionsCompleted}/{report.sessionsScheduled} sessions ·{' '}
            {report.adherencePct}% adherence this week
          </p>
        </section>

        {/* Movement Performance */}
        <section className="card dash-card">
          <h2>📈 Movement Performance</h2>
          {recent ? (
            <div className="dash-stats3">
              <Stat big={`${Math.round(recent.totalRangeOfMotion)}°`} label="Latest ROM" />
              <Stat big={`${completionRate}%`} label="Completion" />
              <Stat big={`${recent.consistencyScore}`} label="Consistency" />
            </div>
          ) : (
            <p className="text-muted">Complete a session to see performance.</p>
          )}
          <Link to="/history" className="dash-link">View history →</Link>
        </section>

        {/* Smart Resistance */}
        <section className="card dash-card">
          <h2>🏋️ Smart Resistance</h2>
          <div className="dash-stats3">
            <Stat big={`${weight.kg.toFixed(1)}kg`} label="Current" />
            <Stat
              big={latestRec?.proposedKg != null ? `${latestRec.proposedKg.toFixed(1)}kg` : '—'}
              label="Proposed next"
            />
            <Stat
              big={latestRec ? statusShort(latestRec.status) : '—'}
              label="Status"
            />
          </div>
          <Link to="/resistance" className="dash-link">Weight history →</Link>
        </section>

        {/* Weekly AI Insights */}
        <section className="card dash-card dash-card--wide">
          <div className="row row--between">
            <h2>🧠 Weekly AI Insights</h2>
            <Link to="/weekly" className="dash-link">Full report →</Link>
          </div>
          <ul className="dash-insights">
            {report.recommendations.slice(0, 2).map((r, i) => (
              <li key={i}>
                <strong>{r.headline}</strong>
                <span className="text-muted"> — {r.detail}</span>
              </li>
            ))}
          </ul>
          <span className="pill pill--rule">rule-based · for clinician review</span>
        </section>

        {/* AI-RAN / Edge Intelligence */}
        <section className="card dash-card dash-card--wide">
          <div className="row row--between">
            <h2>📡 AI-RAN / Edge Intelligence</h2>
            <Link to="/ai-ran" className="dash-link">Open dashboard →</Link>
          </div>
          <div className="dash-stats3">
            <Stat big={inferenceMode === 'edge' ? 'Local Edge' : 'Cloud'} label="Processing mode" />
            <Stat big={isConnected ? 'Active' : 'Idle'} label="Edge inference" />
            <Stat big={connectionState} label="Sensor link" />
          </div>
          <InfraStatusBadge status={infrastructure} showNote />
        </section>
      </div>

      <p className="disclaimer">
        ReHabKnee is a rehabilitation monitoring prototype. Scores and
        recommendations are custom, rule-based indicators for clinician review —
        not clinical diagnoses or validated measures. Demo data is labelled
        throughout.
      </p>
    </div>
  );
}

function WeekStrip({ schedule }: { schedule: ReturnType<typeof getSchedule> }) {
  const start = weekStartOf(new Date());
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
  return (
    <div className="week-strip">
      {days.map((d) => {
        const items = schedule.filter((s) => sameDay(new Date(s.dateTime), d));
        const status = items[0]?.status;
        const isToday = sameDay(d, new Date());
        return (
          <div key={d.toISOString()} className={`strip-day${isToday ? ' is-today' : ''}`}>
            <span className="strip-day__dow">
              {d.toLocaleDateString(undefined, { weekday: 'narrow' })}
            </span>
            <span className={`strip-day__dot${status ? ` dot--${status}` : ''}`} />
          </div>
        );
      })}
    </div>
  );
}

function Stat({ big, label }: { big: string; label: string }) {
  return (
    <div className="dstat">
      <span className="dstat__big">{big}</span>
      <span className="dstat__label">{label}</span>
    </div>
  );
}

function statusShort(s: string): string {
  return s === 'approved' ? 'Approved' : s === 'rejected' ? 'Rejected' : 'Pending';
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
