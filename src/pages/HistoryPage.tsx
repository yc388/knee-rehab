import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { getSessions, reseedDemoData, clearSessions } from '@/services/historyStore';
import { formatDateTime, formatDuration, formatShortDate } from '@/utils/format';
import './HistoryPage.css';

type Metric = 'score' | 'rom';

/** Exercise history with a progress graph and a list of past sessions. */
export function HistoryPage() {
  // `tick` forces a refresh after seeding/clearing.
  const [tick, setTick] = useState(0);
  const [metric, setMetric] = useState<Metric>('score');
  const sessions = useMemo(() => getSessions(), [tick]);

  // Progress graph data, oldest → newest so the trend reads left to right.
  const progressData = useMemo(
    () =>
      [...sessions]
        .reverse()
        .map((s) => ({
          label: formatShortDate(s.completedAt),
          score: s.overallScore,
          rom: Math.round(s.totalRangeOfMotion),
        })),
    [sessions]
  );

  return (
    <div className="page">
      <div className="row row--between row--wrap">
        <h1 style={{ margin: 0 }}>Exercise history</h1>
        <div className="row row--wrap">
          <button
            className="btn btn--ghost"
            onClick={() => {
              reseedDemoData();
              setTick((t) => t + 1);
            }}
          >
            Reset demo data
          </button>
          <button
            className="btn btn--ghost"
            onClick={() => {
              clearSessions();
              setTick((t) => t + 1);
            }}
          >
            Clear all
          </button>
        </div>
      </div>
      <p className="text-muted">
        Review your past sessions and track how your performance changes over
        time.
      </p>

      {sessions.length > 0 && (
        <div className="card">
          <div className="row row--between row--wrap">
            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Progress over time</h2>
            <div className="metric-toggle" role="tablist" aria-label="Progress metric">
              <button
                role="tab"
                aria-selected={metric === 'score'}
                className={metric === 'score' ? 'is-active' : ''}
                onClick={() => setMetric('score')}
              >
                Overall score
              </button>
              <button
                role="tab"
                aria-selected={metric === 'rom'}
                className={metric === 'rom' ? 'is-active' : ''}
                onClick={() => setMetric('rom')}
              >
                Range of motion
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart
              data={progressData}
              margin={{ top: 16, right: 16, bottom: 8, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" stroke="#64748b" fontSize={13} />
              <YAxis
                stroke="#64748b"
                fontSize={13}
                width={44}
                domain={metric === 'score' ? [0, 100] : ['auto', 'auto']}
                tickFormatter={(v: number) =>
                  metric === 'score' ? `${v}` : `${v}°`
                }
              />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
                formatter={(value: number) =>
                  metric === 'score'
                    ? [`${value}/100`, 'Overall score']
                    : [`${value}°`, 'Range of motion']
                }
              />
              <Legend />
              <Line
                type="monotone"
                dataKey={metric}
                name={metric === 'score' ? 'Overall score' : 'Range of motion'}
                stroke="#138a8a"
                strokeWidth={3}
                dot={{ r: 5, fill: '#138a8a' }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <h2 className="section-title">Past sessions</h2>

      {sessions.length === 0 ? (
        <div className="card text-center text-muted">
          No sessions recorded yet. Complete an exercise to build your history.
        </div>
      ) : (
        <div className="history-table card">
          <div className="history-table__head" aria-hidden="true">
            <span>Date</span>
            <span>Exercise</span>
            <span>Reps</span>
            <span>ROM</span>
            <span>Duration</span>
            <span>Score</span>
          </div>
          <ul>
            {sessions.map((s) => (
              <li key={s.id}>
                <Link to={`/history/${s.id}`} className="history-row">
                  <span data-label="Date">{formatDateTime(s.completedAt)}</span>
                  <span data-label="Exercise" className="history-row__name">
                    {s.exerciseName}
                  </span>
                  <span data-label="Reps">
                    {s.repsCompleted}/{s.targetReps}
                  </span>
                  <span data-label="ROM">{Math.round(s.totalRangeOfMotion)}°</span>
                  <span data-label="Duration">
                    {formatDuration(s.durationMs)}
                  </span>
                  <span data-label="Score" className="history-row__score">
                    {s.overallScore}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
