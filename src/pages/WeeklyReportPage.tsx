import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSessions } from '@/services/historyStore';
import {
  getSchedule,
  getCurrentApprovedWeight,
  getPlans,
  savePlan,
  upsertScheduled,
} from '@/services/rehab/rehabStore';
import { usePlatform } from '@/services/PlatformProvider';
import { generateWeeklyReport, weekStartOf } from '@/services/rehab/weeklyAnalysis';
import type { WeeklyMetricComparison } from '@/types/rehab';
import './WeeklyReportPage.css';

const TREND_ICON: Record<WeeklyMetricComparison['trend'], string> = {
  improved: '▲',
  declined: '▼',
  stable: '▬',
  insufficient: '—',
};

/** Weekly Rehabilitation Progress Report + AI recommendations + proposed plan. */
export function WeeklyReportPage() {
  const navigate = useNavigate();
  const { canReview } = usePlatform();
  const [weekOffset, setWeekOffset] = useState(0);
  const [tick, setTick] = useState(0);

  const weekStart = useMemo(() => {
    const d = weekStartOf(new Date());
    d.setDate(d.getDate() - weekOffset * 7);
    return d;
  }, [weekOffset]);

  const sessions = useMemo(() => getSessions(), []);
  const schedule = useMemo(() => getSchedule(), [tick]);
  const currentWeight = useMemo(() => getCurrentApprovedWeight(), []);

  const report = useMemo(
    () =>
      generateWeeklyReport({
        weekStart,
        sessions,
        schedule,
        currentWeightKg: currentWeight.kg,
        painThisWeek: null,
        painPrevWeek: null,
      }),
    [weekStart, sessions, schedule, currentWeight]
  );

  const plan = useMemo(
    () => getPlans().find((p) => p.status === 'pending'),
    [tick]
  );

  const approvePlan = () => {
    if (!plan) return;
    plan.sessions.forEach((s) => upsertScheduled(s));
    savePlan({ ...plan, status: 'approved' });
    setTick((t) => t + 1);
  };

  return (
    <div className="page">
      <div className="row row--between row--wrap">
        <h1 style={{ margin: 0 }}>Weekly Rehabilitation Progress Report</h1>
        <div className="row">
          <button className="btn btn--ghost" onClick={() => setWeekOffset((w) => w + 1)}>
            ← Earlier week
          </button>
          <button
            className="btn btn--ghost"
            onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
            disabled={weekOffset === 0}
          >
            Later week →
          </button>
        </div>
      </div>
      <p className="text-muted">
        Week of {weekStart.toLocaleDateString(undefined, { day: 'numeric', month: 'long' })} ·
        rule-based analysis from stored sessions. Trends treat small changes as
        measurement variation.
      </p>

      {report.insufficientData && (
        <div className="demo-banner">
          ⚠️ Not enough completed sessions this week for a reliable comparison.
          Figures below may be incomplete.
        </div>
      )}

      <div className="wreport-head card">
        <div className="wreport-stat">
          <span className="wreport-stat__big">
            {report.sessionsCompleted}/{report.sessionsScheduled}
          </span>
          <span className="wreport-stat__label">Sessions completed</span>
        </div>
        <div className="wreport-stat">
          <span className="wreport-stat__big">{report.adherencePct}%</span>
          <span className="wreport-stat__label">Weekly adherence</span>
        </div>
        <div className="wreport-stat">
          <span className="wreport-stat__big">{currentWeight.kg.toFixed(1)} kg</span>
          <span className="wreport-stat__label">Current brace weight</span>
        </div>
      </div>

      <h2 className="section-title">Week-over-week comparison</h2>
      <div className="card">
        <table className="wreport-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>Previous</th>
              <th>Current</th>
              <th>Trend</th>
            </tr>
          </thead>
          <tbody>
            {report.comparisons.map((c) => (
              <tr key={c.label}>
                <td>{c.label}</td>
                <td>{c.previous !== null ? `${c.previous}${c.unit}` : '—'}</td>
                <td>{c.current !== null ? `${c.current}${c.unit}` : '—'}</td>
                <td>
                  <span className={`trend trend--${c.trend}`}>
                    {TREND_ICON[c.trend]} {c.trend}
                    {!c.reliable && c.trend !== 'insufficient' && (
                      <span className="trend__note"> (limited data)</span>
                    )}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="section-title">AI-generated recommendations</h2>
      <div className="wreport-recs">
        {report.recommendations.map((r, i) => (
          <div key={i} className={`wrec-item wrec-item--${r.category}`}>
            <h3>{r.headline}</h3>
            <p>{r.detail}</p>
            <span className="wrec-item__tag">rule-based · for clinician review</span>
          </div>
        ))}
      </div>

      {plan && (
        <>
          <h2 className="section-title">Next Week's Proposed Rehabilitation Plan</h2>
          <div className="card">
            <div className="demo-banner" style={{ marginBottom: 16 }}>
              Proposed plan — requires authorised approval before it changes your
              calendar. Nothing is modified silently.
            </div>
            <ul className="plan-list">
              {plan.sessions.map((s) => (
                <li key={s.id}>
                  <span className="plan-list__day">
                    {new Date(s.dateTime).toLocaleDateString(undefined, { weekday: 'long' })}
                  </span>
                  <span className="plan-list__ex">{s.exerciseName}</span>
                  <span className="plan-list__detail">
                    {s.reps} × {s.sets}
                  </span>
                  <span className="plan-list__weight">
                    {s.plannedWeightKg <= 1.5 && s.exerciseName.includes('Hamstring')
                      ? 'Pending review'
                      : `${s.plannedWeightKg.toFixed(1)} kg`}
                  </span>
                </li>
              ))}
            </ul>
            <div className="row row--wrap" style={{ marginTop: 16 }}>
              <button className="btn btn--ghost" onClick={() => navigate('/calendar')}>
                Compare with current week
              </button>
              {canReview ? (
                <button className="btn btn--primary" onClick={approvePlan}>
                  Approve plan
                </button>
              ) : (
                <span className="text-muted" style={{ alignSelf: 'center' }}>
                  Switch to clinician role (header) to approve.
                </span>
              )}
            </div>
          </div>
        </>
      )}

      <p className="disclaimer">
        This report is generated by rule-based analysis of stored session data.
        It is not a clinical assessment. Exercise and resistance changes must be
        reviewed and approved through the rehabilitation plan.
      </p>
    </div>
  );
}
