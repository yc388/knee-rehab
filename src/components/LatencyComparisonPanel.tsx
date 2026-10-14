import type { LatencyStats } from '@/types/analysis';
import './LatencyComparisonPanel.css';

interface Props {
  edge: LatencyStats;
  cloud: LatencyStats;
  /** Active processing mode label. */
  activeLocation: string;
  connectionLabel: string;
}

/**
 * Comparison panel showing MEASURED latency for each backend. Only shows
 * figures that were actually collected; simulated contributions are clearly
 * tagged. If a backend has no samples yet, it shows "—".
 */
export function LatencyComparisonPanel({
  edge,
  cloud,
  activeLocation,
  connectionLabel,
}: Props) {
  return (
    <div className="latency-panel">
      <div className="latency-panel__head">
        <h3>Processing Latency Comparison</h3>
        <span className="latency-panel__sub">
          Based on measurements collected this session
        </span>
      </div>

      <div className="latency-grid">
        <LatencyColumn title="Local Edge" icon="🖥️" stats={edge} />
        <LatencyColumn title="Cloud" icon="☁️" stats={cloud} />
      </div>

      <dl className="latency-meta">
        <div>
          <dt>Processing location</dt>
          <dd>{activeLocation}</dd>
        </div>
        <div>
          <dt>Connection status</dt>
          <dd>{connectionLabel}</dd>
        </div>
      </dl>
    </div>
  );
}

function LatencyColumn({
  title,
  icon,
  stats,
}: {
  title: string;
  icon: string;
  stats: LatencyStats;
}) {
  const has = stats.samples > 0;
  return (
    <div className={`latency-col${stats.simulated ? ' latency-col--sim' : ''}`}>
      <div className="latency-col__title">
        <span aria-hidden="true">{icon}</span> {title}
        {stats.simulated && has && (
          <span className="latency-col__tag">simulated</span>
        )}
      </div>
      <div className="latency-col__big">
        {has ? `${fmt(stats.meanTotalMs)} ms` : '—'}
        <span className="latency-col__biglabel">mean total</span>
      </div>
      <ul className="latency-col__list">
        <li>
          <span>Transmission</span>
          <strong>{has ? `${fmt(stats.meanTransmissionMs)} ms` : '—'}</strong>
        </li>
        <li>
          <span>AI inference</span>
          <strong>{has ? `${fmt(stats.meanInferenceMs)} ms` : '—'}</strong>
        </li>
        <li>
          <span>Last total</span>
          <strong>{has ? `${fmt(stats.lastTotalMs)} ms` : '—'}</strong>
        </li>
        <li>
          <span>Samples</span>
          <strong>{stats.samples}</strong>
        </li>
      </ul>
      <div className={`latency-col__avail latency-col__avail--${stats.availability}`}>
        {availabilityLabel(stats.availability)}
      </div>
    </div>
  );
}

function fmt(n: number | null): string {
  if (n === null) return '—';
  return n < 1 ? n.toFixed(2) : n.toFixed(1);
}

function availabilityLabel(a: LatencyStats['availability']): string {
  switch (a) {
    case 'available':
      return 'Backend available';
    case 'unavailable':
      return 'Backend unavailable (demo figures)';
    case 'checking':
      return 'Checking…';
  }
}
