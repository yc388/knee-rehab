import './ScoreRing.css';

interface Props {
  /** Score 0–100. */
  score: number;
  size?: number;
}

/** Circular progress ring showing an overall score out of 100. */
export function ScoreRing({ score, size = 160 }: Props) {
  const clamped = Math.min(Math.max(score, 0), 100);
  const stroke = 14;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - clamped / 100);
  const color =
    clamped >= 80 ? '#16a34a' : clamped >= 60 ? '#138a8a' : '#d97706';

  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} role="img" aria-label={`Overall score ${clamped} out of 100`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="score-ring__text">
        <span className="score-ring__value" style={{ color }}>
          {Math.round(clamped)}
        </span>
        <span className="score-ring__max">/ 100</span>
      </div>
    </div>
  );
}
