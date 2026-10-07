/** Formatting helpers used across the UI. */

/** "00:42" style mm:ss from milliseconds. */
export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${pad(minutes)}:${pad(seconds)}`;
}

/** "1 min 34 sec" style human duration from milliseconds. */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds} sec`;
  return `${minutes} min ${seconds} sec`;
}

/** Friendly date like "7 Oct 2026, 14:32". */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Short date like "7 Oct". */
export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}
