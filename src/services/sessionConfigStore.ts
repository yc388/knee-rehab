import type { SessionConfig } from '@/types/exercise';

/**
 * Tiny store carrying the user's chosen session configuration (target reps /
 * angle) from the Instructions screen to the Live Session screen. Kept in
 * sessionStorage so a mid-flow refresh doesn't lose the choice.
 */
const KEY = 'rehabknee.sessionConfig.v1';

export function saveSessionConfig(exerciseId: string, config: SessionConfig): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ exerciseId, config }));
  } catch {
    /* ignore */
  }
}

export function loadSessionConfig(exerciseId: string): SessionConfig | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      exerciseId: string;
      config: SessionConfig;
    };
    return parsed.exerciseId === exerciseId ? parsed.config : null;
  } catch {
    return null;
  }
}
