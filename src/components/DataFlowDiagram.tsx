import './DataFlowDiagram.css';

interface Props {
  /** Which stage is currently "active" (lit up), if any. */
  activeStage?: number;
  /** Whether live activity is flowing (animates the connectors). */
  live?: boolean;
}

const STAGES = [
  { icon: '🦿', label: 'Physical Knee Brace', sub: 'IMU sensors' },
  { icon: '📶', label: 'Wireless Network', sub: 'BLE / Wi-Fi / 5G' },
  { icon: '🧠', label: 'Edge AI Engine', sub: 'Movement inference' },
  { icon: '📊', label: 'Movement Analysis', sub: 'Reps · ROM · quality' },
  { icon: '💬', label: 'Patient Feedback', sub: 'Real-time cues' },
];

/**
 * Interactive data-flow diagram:
 *   Physical Knee Brace → Wireless Network → Edge AI Engine →
 *   Movement Analysis → Real-Time Patient Feedback
 */
export function DataFlowDiagram({ activeStage, live = false }: Props) {
  return (
    <div className={`flow${live ? ' flow--live' : ''}`}>
      {STAGES.map((s, i) => (
        <div className="flow__node-wrap" key={s.label}>
          <div
            className={`flow__node${activeStage === i ? ' is-active' : ''}`}
          >
            <span className="flow__icon" aria-hidden="true">
              {s.icon}
            </span>
            <span className="flow__label">{s.label}</span>
            <span className="flow__sub">{s.sub}</span>
          </div>
          {i < STAGES.length - 1 && (
            <div className="flow__connector" aria-hidden="true">
              <span className="flow__arrow">→</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
