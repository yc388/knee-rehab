import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { getWeightHistory, getCurrentApprovedWeight } from '@/services/rehab/rehabStore';
import { getSessions } from '@/services/historyStore';
import { WEIGHT_MIN_KG, WEIGHT_MAX_KG } from '@/types/rehab';
import { weekStartOf } from '@/services/rehab/weeklyAnalysis';
import { formatShortDate } from '@/utils/format';
import './ResistancePage.css';

/** Resistance Progression — approved weight over time vs performance. */
export function ResistancePage() {
  const history = useMemo(() => getWeightHistory(), []);
  const current = useMemo(() => getCurrentApprovedWeight(), []);
  const sessions = useMemo(() => getSessions(), []);

  // Build weekly series combining approved weight + weekly ROM / completion.
  const data = useMemo(() => {
    // Group weight settings by week.
    const weekly: Record<string, { label: string; weight: number; rom: number | null; completion: number | null }> = {};
    history.forEach((w) => {
      const ws = weekStartOf(new Date(w.effectiveAt)).toISOString().slice(0, 10);
      weekly[ws] = {
        label: formatShortDate(w.effectiveAt),
        weight: w.kg,
        rom: null,
        completion: null,
      };
    });
    // Fold in session-derived metrics per week.
    sessions.forEach((s) => {
      const ws = weekStartOf(new Date(s.completedAt)).toISOString().slice(0, 10);
      if (!weekly[ws]) {
        weekly[ws] = { label: formatShortDate(s.completedAt), weight: current.kg, rom: null, completion: null };
      }
      const bucket = weekly[ws];
      bucket.rom = bucket.rom === null ? s.totalRangeOfMotion : (bucket.rom + s.totalRangeOfMotion) / 2;
      const comp = s.targetReps > 0 ? (s.goodReps / s.targetReps) * 100 : 0;
      bucket.completion = bucket.completion === null ? comp : (bucket.completion + comp) / 2;
    });
    return Object.keys(weekly)
      .sort()
      .map((k) => ({
        label: weekly[k].label,
        weight: Math.round(weekly[k].weight * 10) / 10,
        rom: weekly[k].rom !== null ? Math.round(weekly[k].rom!) : null,
        completion: weekly[k].completion !== null ? Math.round(weekly[k].completion!) : null,
      }));
  }, [history, sessions, current]);

  return (
    <div className="page">
      <h1>Resistance Progression</h1>
      <p className="text-muted">
        Your <strong>approved</strong> brace setting over time, compared with
        performance. Increasing resistance does not by itself mean rehabilitation
        is improving — look for improved performance at the same weight too.
      </p>

      <div className="demo-banner">
        🧪 Weight values shown are demonstration data unless you record and
        approve real sessions. They are not a clinical progression schedule.
      </div>

      <div className="res-current card">
        <div>
          <span className="res-current__label">Current approved weight</span>
          <span className="res-current__value">{current.kg.toFixed(1)} kg</span>
          {current.status === 'pending' && (
            <span className="res-current__pending">Pending Approval</span>
          )}
        </div>
        <span className="res-current__range">
          Device range {WEIGHT_MIN_KG}–{WEIGHT_MAX_KG} kg
        </span>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Approved weight over time</h2>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" stroke="#64748b" fontSize={13} />
            <YAxis
              domain={[WEIGHT_MIN_KG - 0.5, WEIGHT_MAX_KG]}
              stroke="#64748b"
              fontSize={13}
              width={48}
              tickFormatter={(v: number) => `${v}kg`}
            />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
              formatter={(v: number) => [`${v} kg`, 'Approved weight']}
            />
            <ReferenceLine y={WEIGHT_MIN_KG} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: 'min 1.5kg', fontSize: 11, fill: '#94a3b8' }} />
            <Line type="stepAfter" dataKey="weight" stroke="#2563eb" strokeWidth={3} dot={{ r: 5, fill: '#2563eb' }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <h2 className="section-title">Compare weight against performance</h2>
      <div className="card">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" stroke="#64748b" fontSize={13} />
            <YAxis stroke="#64748b" fontSize={13} width={44} />
            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
            <Legend />
            <Line type="monotone" dataKey="rom" name="Range of motion (°)" stroke="#138a8a" strokeWidth={3} dot={{ r: 4 }} isAnimationActive={false} connectNulls />
            <Line type="monotone" dataKey="completion" name="Completion (%)" stroke="#16a34a" strokeWidth={3} dot={{ r: 4 }} isAnimationActive={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: 0 }}>
          Improved range of motion or completion at the <strong>same</strong>{' '}
          weight is a positive progress indicator.
        </p>
      </div>
    </div>
  );
}
