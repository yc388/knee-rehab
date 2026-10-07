import type { ReactNode } from 'react';
import './MetricTile.css';

interface Props {
  label: string;
  value: ReactNode;
  unit?: string;
  icon?: string;
  /** Visual emphasis for the most important live tiles. */
  emphasis?: boolean;
}

/** A single large, high-contrast metric readout. */
export function MetricTile({ label, value, unit, icon, emphasis }: Props) {
  return (
    <div className={`metric-tile${emphasis ? ' metric-tile--emphasis' : ''}`}>
      <span className="metric-tile__label">
        {icon && <span aria-hidden="true">{icon} </span>}
        {label}
      </span>
      <span className="metric-tile__value">
        {value}
        {unit && <span className="metric-tile__unit">{unit}</span>}
      </span>
    </div>
  );
}
