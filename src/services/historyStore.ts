import type { SessionSummary } from '@/types/exercise';
import { SEED_SESSIONS } from '@/data/seedHistory';

/**
 * historyStore — persists completed sessions locally (localStorage).
 *
 * This is the stand-in for a future backend. The rest of the app only uses the
 * exported functions, so the storage mechanism can be swapped later without
 * touching the UI.
 */
const STORAGE_KEY = 'rehabknee.sessions.v1';
const SEEDED_FLAG = 'rehabknee.seeded.v1';

/** Return all stored sessions, newest first. Seeds demo data on first run. */
export function getSessions(): SessionSummary[] {
  seedIfNeeded();
  const raw = safeGet(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SessionSummary[];
    return [...parsed].sort(
      (a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );
  } catch {
    return [];
  }
}

/** Fetch a single session by id. */
export function getSessionById(id: string): SessionSummary | undefined {
  return getSessions().find((s) => s.id === id);
}

/** Persist a newly completed session. Returns the saved session. */
export function saveSession(session: SessionSummary): SessionSummary {
  const existing = readRaw();
  existing.push(session);
  safeSet(STORAGE_KEY, JSON.stringify(existing));
  return session;
}

/** Remove all stored sessions (including seeds). Useful for demos. */
export function clearSessions(): void {
  safeSet(STORAGE_KEY, JSON.stringify([]));
  safeSet(SEEDED_FLAG, 'true');
}

/** Re-seed the demo history (clears, then inserts seed sessions). */
export function reseedDemoData(): void {
  safeSet(STORAGE_KEY, JSON.stringify(SEED_SESSIONS));
  safeSet(SEEDED_FLAG, 'true');
}

function readRaw(): SessionSummary[] {
  const raw = safeGet(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SessionSummary[];
  } catch {
    return [];
  }
}

function seedIfNeeded(): void {
  if (safeGet(SEEDED_FLAG)) return;
  safeSet(STORAGE_KEY, JSON.stringify(SEED_SESSIONS));
  safeSet(SEEDED_FLAG, 'true');
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable — ignore in prototype */
  }
}
