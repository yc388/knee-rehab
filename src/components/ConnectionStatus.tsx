import type { BraceConnectionState } from '@/types/sensor';

interface Props {
  state: BraceConnectionState;
}

const LABELS: Record<BraceConnectionState, string> = {
  connected: 'Brace Connected',
  disconnected: 'Brace Disconnected',
  connecting: 'Connecting…',
  reconnecting: 'Reconnecting…',
  error: 'Connection Error',
};

/** Clear, high-contrast connection indicator with a status dot. */
export function ConnectionStatus({ state }: Props) {
  return (
    <span className={`status status--${state}`} role="status" aria-live="polite">
      <span className="status__dot" aria-hidden="true" />
      {LABELS[state]}
    </span>
  );
}
