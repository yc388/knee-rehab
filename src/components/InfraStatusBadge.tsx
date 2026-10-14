import type { InfrastructureStatus } from '@/types/analysis';
import './InfraStatusBadge.css';

const META: Record<
  InfrastructureStatus,
  { label: string; icon: string; cls: string; note: string }
> = {
  'local-edge': {
    label: 'Local Edge AI',
    icon: '🖥️',
    cls: 'infra--edge',
    note: 'Analysis runs in-browser, next to the device.',
  },
  cloud: {
    label: 'Cloud AI',
    icon: '☁️',
    cls: 'infra--cloud',
    note: 'Analysis runs on a remote backend.',
  },
  'ai-ran-edge': {
    label: 'AI-RAN Edge',
    icon: '📡',
    cls: 'infra--airan',
    note: 'Confirmed AI-RAN edge backend connected.',
  },
  simulation: {
    label: 'Simulation Mode',
    icon: '🧪',
    cls: 'infra--sim',
    note: 'Simulated sensor data for demonstration.',
  },
};

/**
 * Honest infrastructure indicator. `AI-RAN Edge` is only ever shown when a
 * compatible AI-RAN backend is actually confirmed — never for the local
 * prototype.
 */
export function InfraStatusBadge({
  status,
  showNote = false,
}: {
  status: InfrastructureStatus;
  showNote?: boolean;
}) {
  const m = META[status];
  return (
    <span className={`infra ${m.cls}`} title={m.note}>
      <span aria-hidden="true">{m.icon}</span>
      <span>{m.label}</span>
      {showNote && <span className="infra__note">· {m.note}</span>}
    </span>
  );
}
