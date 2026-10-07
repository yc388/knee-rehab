import './KneeAngleGauge.css';

interface Props {
  /** Current knee angle in degrees. */
  angle: number;
  /** Minimum angle on the gauge scale. */
  min?: number;
  /** Maximum angle on the gauge scale. */
  max?: number;
  /** Optional target angle marker. */
  target?: number;
}

/**
 * A large semicircular gauge visualising the knee angle. The needle sweeps
 * across a 180° arc mapped to the [min, max] angle range. Also renders a simple
 * schematic of the leg bending at the measured angle.
 */
export function KneeAngleGauge({ angle, min = 0, max = 130, target }: Props) {
  const clamped = Math.min(Math.max(angle, min), max);
  const ratio = (clamped - min) / (max - min);

  // Arc geometry: 180° sweep from left (180°) to right (0°).
  const cx = 150;
  const cy = 150;
  const r = 120;
  const needleAngleDeg = 180 - ratio * 180;
  const needleRad = (needleAngleDeg * Math.PI) / 180;
  const nx = cx + r * 0.86 * Math.cos(needleRad);
  const ny = cy - r * 0.86 * Math.sin(needleRad);

  // Target tick
  let targetTick: { x1: number; y1: number; x2: number; y2: number } | null =
    null;
  if (typeof target === 'number') {
    const tRatio = (Math.min(Math.max(target, min), max) - min) / (max - min);
    const tDeg = 180 - tRatio * 180;
    const tRad = (tDeg * Math.PI) / 180;
    targetTick = {
      x1: cx + r * 0.98 * Math.cos(tRad),
      y1: cy - r * 0.98 * Math.sin(tRad),
      x2: cx + r * 1.14 * Math.cos(tRad),
      y2: cy - r * 1.14 * Math.sin(tRad),
    };
  }

  // Background arc path (semicircle)
  const arcStart = { x: cx - r, y: cy };
  const arcEnd = { x: cx + r, y: cy };
  const arcPath = `M ${arcStart.x} ${arcStart.y} A ${r} ${r} 0 0 1 ${arcEnd.x} ${arcEnd.y}`;

  // Progress arc up to current ratio
  const progDeg = 180 - ratio * 180;
  const progRad = (progDeg * Math.PI) / 180;
  const progEnd = {
    x: cx + r * Math.cos(progRad),
    y: cy - r * Math.sin(progRad),
  };
  const largeArc = ratio > 0.5 ? 1 : 0;
  const progPath = `M ${arcStart.x} ${arcStart.y} A ${r} ${r} 0 ${largeArc} 1 ${progEnd.x} ${progEnd.y}`;

  return (
    <div className="gauge">
      <svg
        viewBox="0 0 300 190"
        className="gauge__svg"
        role="img"
        aria-label={`Knee angle ${Math.round(angle)} degrees`}
      >
        <path d={arcPath} className="gauge__track" />
        <path d={progPath} className="gauge__progress" />

        {targetTick && (
          <line
            x1={targetTick.x1}
            y1={targetTick.y1}
            x2={targetTick.x2}
            y2={targetTick.y2}
            className="gauge__target"
          />
        )}

        {/* Needle */}
        <line x1={cx} y1={cy} x2={nx} y2={ny} className="gauge__needle" />
        <circle cx={cx} cy={cy} r={9} className="gauge__hub" />
      </svg>

      <div className="gauge__readout">
        <span className="gauge__value">{Math.round(angle)}°</span>
        <span className="gauge__label">Knee Angle</span>
      </div>
    </div>
  );
}
