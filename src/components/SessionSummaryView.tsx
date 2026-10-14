import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { AngleChart } from '@/components/AngleChart';
import { MetricTile } from '@/components/MetricTile';
import { ScoreRing } from '@/components/ScoreRing';
import { InfraStatusBadge } from '@/components/InfraStatusBadge';
import type { SessionSummary } from '@/types/exercise';
import { formatDuration } from '@/utils/format';
import '@/pages/ResultsPage.css';

interface Props {
  session: SessionSummary;
}

const CLASS_COLOR: Record<string, string> = {
  good: '#16a34a',
  incomplete: '#94a3b8',
  'too-fast': '#f97316',
  inconsistent: '#eab308',
};

/**
 * Shared session summary (score, metrics, per-rep chart, feedback, graph).
 * Used by the post-exercise Results screen and the History detail screen.
 */
export function SessionSummaryView({ session }: Props) {
  const angles = session.angleTrace.map((s) => s.angle);
  const yMin = angles.length ? Math.min(...angles) - 10 : 0;
  const yMax = angles.length ? Math.max(...angles) + 10 : 130;

  const repChartData = session.reps.map((r) => ({
    name: `#${r.index}`,
    rom: r.rangeOfMotion,
    classification: r.classification,
  }));

  return (
    <>
      <div className="results-top">
        <div className="card results-score">
          <ScoreRing score={session.overallScore} />
          <div className="results-score__caption">Overall Score</div>
          <InfraStatusBadge status={session.processingLocation} />
        </div>

        <div className="results-headline">
          <MetricTile
            label="Repetitions completed"
            value={`${session.repsCompleted} / ${session.targetReps}`}
            icon="🔁"
            emphasis
          />
          <MetricTile
            label="Successful repetitions"
            value={`${session.goodReps}`}
            icon="✅"
          />
          <MetricTile
            label="Incomplete repetitions"
            value={`${session.incompleteReps}`}
            icon="⚠️"
          />
        </div>
      </div>

      <h2 className="section-title">Movement summary</h2>
      <div className="grid results-grid">
        <MetricTile label="Maximum knee flexion" value={Math.round(session.maxFlexion)} unit="°" />
        <MetricTile label="Maximum knee extension" value={Math.round(session.maxExtension)} unit="°" />
        <MetricTile label="Average knee angle" value={Math.round(session.averageKneeAngle)} unit="°" />
        <MetricTile label="Total range of motion" value={Math.round(session.totalRangeOfMotion)} unit="°" />
        <MetricTile label="Average movement speed" value={Math.round(session.averageSpeed)} unit="°/s" />
        <MetricTile label="Avg repetition time" value={(session.averageRepDurationMs / 1000).toFixed(1)} unit="s" />
        <MetricTile label="ROM consistency" value={session.consistencyScore} unit="%" />
        <MetricTile label="Movement smoothness" value={session.smoothnessScore} unit="/100" />
      </div>

      {repChartData.length > 0 && (
        <>
          <h2 className="section-title">Range of motion per repetition</h2>
          <div className="card">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={repChartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={13} />
                <YAxis
                  stroke="#64748b"
                  fontSize={13}
                  width={44}
                  tickFormatter={(v: number) => `${v}°`}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
                  formatter={(v: number, _n: string, p: { payload: { classification: string } }) => [
                    `${v}° (${p.payload.classification})`,
                    'ROM',
                  ]}
                />
                <Bar dataKey="rom" radius={[6, 6, 0, 0]}>
                  {repChartData.map((d, i) => (
                    <Cell key={i} fill={CLASS_COLOR[d.classification] ?? '#138a8a'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="rep-legend">
              <span><i style={{ background: CLASS_COLOR.good }} />Good</span>
              <span><i style={{ background: CLASS_COLOR.incomplete }} />Incomplete</span>
              <span><i style={{ background: CLASS_COLOR['too-fast'] }} />Too fast</span>
              <span><i style={{ background: CLASS_COLOR.inconsistent }} />Inconsistent</span>
            </div>
          </div>
        </>
      )}

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

      <h2 className="section-title">Session graph · total time {formatDuration(session.durationMs)}</h2>
      <div className="card">
        <AngleChart data={session.angleTrace} height={300} yDomain={[yMin, yMax]} />
      </div>

      <p className="results-scorenote text-muted">
        <strong>How scores are calculated:</strong> the overall score (0–100) is
        a custom indicator blending successful-rep completion (40%), achieved ROM
        vs your target (25%), ROM consistency (20%) and movement smoothness
        (15%). These are movement-quality indicators, not clinical measures.
      </p>
    </>
  );
}
