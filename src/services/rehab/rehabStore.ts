import {
  WEIGHT_MIN_KG,
  type PatientProfile,
  type ScheduledSession,
  type ResistanceSetting,
  type ResistanceRecommendation,
  type WeeklyReport,
  type ProposedPlan,
  type SessionContext,
} from '@/types/rehab';
import { SEED_REHAB } from '@/data/seedRehab';

/**
 * rehabStore — persistent store for the rehabilitation-management layer
 * (profile, schedule, resistance settings/approvals, per-session context,
 * weekly reports, proposed plans). localStorage stands in for a backend;
 * everything is namespaced and seeded with clearly-labelled demo data.
 *
 * NOTE on privacy/access: this prototype keeps all data locally in the
 * browser. A production system would add authentication and role-based access
 * (patient vs clinician) and encrypt data in transit/at rest — see README.
 */
const KEYS = {
  profile: 'rehabknee.profile.v1',
  schedule: 'rehabknee.schedule.v1',
  weights: 'rehabknee.weights.v1',
  recs: 'rehabknee.recs.v1',
  reports: 'rehabknee.reports.v1',
  plans: 'rehabknee.plans.v1',
  contexts: 'rehabknee.contexts.v1',
  seeded: 'rehabknee.rehabSeeded.v1',
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

function seedIfNeeded(): void {
  try {
    if (localStorage.getItem(KEYS.seeded)) return;
    write(KEYS.profile, SEED_REHAB.profile);
    write(KEYS.schedule, SEED_REHAB.schedule);
    write(KEYS.weights, SEED_REHAB.weights);
    write(KEYS.recs, SEED_REHAB.recommendations);
    write(KEYS.reports, SEED_REHAB.reports);
    write(KEYS.plans, SEED_REHAB.plans);
    write(KEYS.contexts, SEED_REHAB.contexts);
    localStorage.setItem(KEYS.seeded, 'true');
  } catch {
    /* ignore */
  }
}

// ---- Profile ----
export function getProfile(): PatientProfile {
  seedIfNeeded();
  return read<PatientProfile>(KEYS.profile, SEED_REHAB.profile);
}
export function saveProfile(p: PatientProfile): void {
  write(KEYS.profile, p);
}

// ---- Schedule ----
export function getSchedule(): ScheduledSession[] {
  seedIfNeeded();
  return read<ScheduledSession[]>(KEYS.schedule, []);
}
export function saveSchedule(list: ScheduledSession[]): void {
  write(KEYS.schedule, list);
}
export function upsertScheduled(s: ScheduledSession): void {
  const list = getSchedule();
  const i = list.findIndex((x) => x.id === s.id);
  if (i >= 0) list[i] = s;
  else list.push(s);
  saveSchedule(list);
}
export function getScheduledById(id: string): ScheduledSession | undefined {
  return getSchedule().find((s) => s.id === id);
}
/** Mark a scheduled session completed, linked to a stored session summary. */
export function markScheduledCompleted(
  scheduledId: string,
  completedSessionId: string
): void {
  const list = getSchedule();
  const i = list.findIndex((x) => x.id === scheduledId);
  if (i >= 0) {
    list[i] = {
      ...list[i],
      status: 'completed',
      completedSessionId,
    };
    saveSchedule(list);
  }
}

// ---- Resistance (weight) history ----
export function getWeightHistory(): ResistanceSetting[] {
  seedIfNeeded();
  return read<ResistanceSetting[]>(KEYS.weights, []);
}
export function addWeightSetting(s: ResistanceSetting): void {
  const list = getWeightHistory();
  list.push(s);
  write(KEYS.weights, list);
}
/** The latest APPROVED weight, or the initial 1.5 kg default. */
export function getCurrentApprovedWeight(): ResistanceSetting {
  const approved = getWeightHistory()
    .filter((w) => w.status === 'approved')
    .sort(
      (a, b) =>
        new Date(b.effectiveAt).getTime() - new Date(a.effectiveAt).getTime()
    );
  if (approved[0]) return approved[0];
  const profile = getProfile();
  return {
    kg: WEIGHT_MIN_KG,
    status: profile.initialSettingPendingApproval ? 'pending' : 'approved',
    effectiveAt: profile.createdAt,
    provenance: 'rule-based',
    note: profile.initialSettingPendingApproval
      ? 'Initial Device Setting — Pending Approval'
      : 'Initial device setting',
  };
}

// ---- Recommendations ----
export function getRecommendations(): ResistanceRecommendation[] {
  seedIfNeeded();
  return read<ResistanceRecommendation[]>(KEYS.recs, []);
}
export function addRecommendation(r: ResistanceRecommendation): void {
  const list = getRecommendations();
  list.push(r);
  write(KEYS.recs, list);
}

// ---- Weekly reports ----
export function getReports(): WeeklyReport[] {
  seedIfNeeded();
  return read<WeeklyReport[]>(KEYS.reports, []);
}
export function saveReport(r: WeeklyReport): void {
  const list = getReports().filter((x) => x.weekStart !== r.weekStart);
  list.push(r);
  write(KEYS.reports, list);
}

// ---- Proposed plans ----
export function getPlans(): ProposedPlan[] {
  seedIfNeeded();
  return read<ProposedPlan[]>(KEYS.plans, []);
}
export function savePlan(p: ProposedPlan): void {
  const list = getPlans().filter((x) => x.id !== p.id);
  list.push(p);
  write(KEYS.plans, list);
}

// ---- Session contexts (weight/report/recommendation per stored session) ----
export function getContexts(): Record<string, SessionContext> {
  seedIfNeeded();
  return read<Record<string, SessionContext>>(KEYS.contexts, {});
}
export function setContext(sessionId: string, ctx: SessionContext): void {
  const all = getContexts();
  all[sessionId] = ctx;
  write(KEYS.contexts, all);
}
export function getContext(sessionId: string): SessionContext | undefined {
  return getContexts()[sessionId];
}

// ---- Demo controls ----
export function reseedRehabDemo(): void {
  write(KEYS.profile, SEED_REHAB.profile);
  write(KEYS.schedule, SEED_REHAB.schedule);
  write(KEYS.weights, SEED_REHAB.weights);
  write(KEYS.recs, SEED_REHAB.recommendations);
  write(KEYS.reports, SEED_REHAB.reports);
  write(KEYS.plans, SEED_REHAB.plans);
  write(KEYS.contexts, SEED_REHAB.contexts);
  try {
    localStorage.setItem(KEYS.seeded, 'true');
  } catch {
    /* ignore */
  }
}
