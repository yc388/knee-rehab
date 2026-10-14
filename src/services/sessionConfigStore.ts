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

/**
 * Optional link from a calendar-launched session to its scheduled-session id,
 * so completing the exercise can mark the calendar event complete.
 */
const LINK_KEY = 'rehabknee.scheduledLink.v1';

export function saveScheduledLink(exerciseId: string, scheduledId: string): void {
  try {
    sessionStorage.setItem(LINK_KEY, JSON.stringify({ exerciseId, scheduledId }));
  } catch {
    /* ignore */
  }
}

export function loadScheduledLink(exerciseId: string): string | null {
  try {
    const raw = sessionStorage.getItem(LINK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { exerciseId: string; scheduledId: string };
    return parsed.exerciseId === exerciseId ? parsed.scheduledId : null;
  } catch {
    return null;
  }
}

export function clearScheduledLink(): void {
  try {
    sessionStorage.removeItem(LINK_KEY);
  } catch {
    /* ignore */
  }
}
