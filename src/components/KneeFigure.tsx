import './KneeFigure.css';

interface Props {
  /** Knee flexion angle, degrees (0 = straight). */
  angle: number;
  /** Optional target angle to show as a ghost limb. */
  target?: number;
}

/**
 * Animated side-view knee figure driven by the live sensor angle.
 *
 * Thigh is fixed; the shank rotates about the knee joint by the flexion angle,
 * so the limb visibly bends/straightens with the real reading. A faint ghost
 * shank shows the configured target angle.
 */
export function KneeFigure({ angle, target }: Props) {
  const hip = { x: 150, y: 40 };
  const knee = { x: 150, y: 150 };
  const shankLen = 110;

  // 0° = straight (shank continues downward). Flexion rotates the shank back.
  const shankEnd = (deg: number) => {
    const rad = ((90 + deg) * Math.PI) / 180; // measured from +x axis
    return {
      x: knee.x - shankLen * Math.cos(rad),
      y: knee.y + shankLen * Math.sin(rad),
    };
  };

  const foot = shankEnd(angle);
  const ghost = typeof target === 'number' ? shankEnd(target) : null;

  return (
    <svg viewBox="0 0 300 290" className="knee-figure" role="img"
      aria-label={`Knee bent at ${Math.round(angle)} degrees`}>
      {/* Target ghost shank */}
      {ghost && (
        <g className="knee-figure__ghost">
          <line x1={knee.x} y1={knee.y} x2={ghost.x} y2={ghost.y} />
          <circle cx={ghost.x} cy={ghost.y} r={9} />
        </g>
      )}

      {/* Thigh (fixed) */}
      <line
        x1={hip.x}
        y1={hip.y}
        x2={knee.x}
        y2={knee.y}
        className="knee-figure__thigh"
      />
      {/* Hip joint */}
      <circle cx={hip.x} cy={hip.y} r={12} className="knee-figure__hip" />

      {/* Shank (rotates) */}
      <line
        x1={knee.x}
        y1={knee.y}
        x2={foot.x}
        y2={foot.y}
        className="knee-figure__shank"
      />
      {/* Knee joint + brace */}
      <circle cx={knee.x} cy={knee.y} r={16} className="knee-figure__brace" />
      <circle cx={knee.x} cy={knee.y} r={9} className="knee-figure__knee" />
      {/* Foot */}
      <circle cx={foot.x} cy={foot.y} r={10} className="knee-figure__foot" />

      {/* Angle label at knee */}
      <text x={knee.x + 24} y={knee.y - 6} className="knee-figure__label">
        {Math.round(angle)}°
      </text>
    </svg>
  );
}
