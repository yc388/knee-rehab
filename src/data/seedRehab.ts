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

/**
 * Four-week demonstration dataset for the rehabilitation-management layer.
 * ALL of this is clearly labelled demonstration data (provenance tags +
 * visible UI banners). It is NOT a clinical prescription or progression
 * schedule.
 */

function dateAt(daysFromNow: number, hour = 9, min = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
}

function weekStart(weeksAgo: number): string {
  const d = new Date();
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day - weeksAgo * 7);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

const profile: PatientProfile = {
  id: 'demo-patient',
  name: 'Demo Patient',
  createdAt: dateAt(-27),
  initialSettingPendingApproval: false,
  assessmentComplete: true,
};

// A plausible mix of past (completed/missed) and upcoming sessions.
const schedule: ScheduledSession[] = [
  // This week — some done, one upcoming, one rest day
  mk('s-mon', dateAt(-dayOffsetToMonday()), 'sit-to-stand', 'Sit-to-Stand', 2, 10, 15, 1.5, 'completed'),
  mk('s-wed', dateAt(-dayOffsetToMonday() + 2), 'leg-extension', 'Leg Extension', 2, 12, 20, 1.5, 'completed'),
  mk('s-fri', dateAt(-dayOffsetToMonday() + 4), 'hamstring-curls', 'Hamstring Curls', 2, 10, 110, 1.5, 'upcoming'),
  mk('s-sun', dateAt(-dayOffsetToMonday() + 6), 'squat', 'Squat', 2, 10, 95, 2.0, 'upcoming'),
  // Next few days quick-access
  mk('s-next1', dateAt(1), 'leg-extension', 'Leg Extension', 2, 12, 20, 2.0, 'upcoming'),
  mk('s-next2', dateAt(3), 'lunges', 'Lunges', 2, 8, 90, 2.0, 'upcoming'),
];

function dayOffsetToMonday(): number {
  const d = new Date();
  return (d.getDay() + 6) % 7;
}

function mk(
  id: string,
  dateTime: string,
  exerciseId: string,
  exerciseName: string,
  sets: number,
  reps: number,
  targetAngle: number,
  plannedWeightKg: number,
  status: ScheduledSession['status']
): ScheduledSession {
  return {
    id,
    dateTime,
    exerciseId,
    exerciseName,
    sets,
    reps,
    targetAngle,
    plannedWeightKg,
    status,
    provenance: 'demonstration',
  };
}

// Resistance progression over 4 weeks with one clinician-approved increase.
const weights: ResistanceSetting[] = [
  { kg: 1.5, status: 'approved', effectiveAt: weekStart(3), provenance: 'demonstration', note: 'Initial device setting (confirmed)' },
  { kg: 1.5, status: 'approved', effectiveAt: weekStart(2), provenance: 'demonstration' },
  { kg: 2.0, status: 'approved', effectiveAt: weekStart(1), provenance: 'clinician-approved', note: 'Clinician-approved progression example' },
  { kg: 2.0, status: 'approved', effectiveAt: weekStart(0), provenance: 'demonstration' },
];

const recommendations: ResistanceRecommendation[] = [
  {
    category: 'consider-increase',
    currentKg: 1.5,
    proposedKg: 2.0,
    headline:
      'Your exercise performance met the configured targets. A resistance increase may be considered at your next review.',
    reason:
      'Performance met the configured targets with acceptable reported symptoms (demonstration).',
    status: 'approved',
    provenance: 'clinician-approved',
    insufficientData: false,
    clinicalReviewRecommended: false,
  },
];

const reports: WeeklyReport[] = [
  {
    id: `week-${weekStart(1).slice(0, 10)}`,
    weekStart: weekStart(1),
    sessionsCompleted: 4,
    sessionsScheduled: 4,
    adherencePct: 100,
    insufficientData: false,
    provenance: 'demonstration',
    comparisons: [
      c('Average max knee flexion', '°', 80, 87, 'improved'),
      c('Average range of motion', '°', 63, 71, 'improved'),
      c('Repetition completion rate', '%', 85, 95, 'improved'),
      c('Movement consistency', '/100', 78, 85, 'improved'),
      c('Average session duration', 's', 98, 96, 'stable'),
      c('Reported pain', '/10', 2, 2, 'stable'),
    ],
    recommendations: [
      {
        category: 'review-resistance',
        headline: 'Review resistance progression',
        detail:
          'Your performance has remained consistent across recent sessions. Consider discussing a resistance progression with your physiotherapist.',
        provenance: 'demonstration',
      },
    ],
  },
];

function c(
  label: string,
  unit: string,
  previous: number,
  current: number,
  trend: WeeklyReport['comparisons'][number]['trend']
) {
  return { label, unit, previous, current, trend, reliable: true };
}

const plans: ProposedPlan[] = [
  {
    id: 'plan-next',
    weekStart: weekStart(-1),
    status: 'pending',
    basedOnReportId: reports[0].id,
    provenance: 'demonstration',
    sessions: [
      mk('p-mon', dateAt(7, 9), 'sit-to-stand', 'Sit-to-Stand', 2, 10, 15, 2.0, 'upcoming'),
      mk('p-wed', dateAt(9, 9), 'leg-extension', 'Leg Extension', 2, 12, 20, 2.0, 'upcoming'),
      mk('p-fri', dateAt(11, 9), 'hamstring-curls', 'Hamstring Curls', 2, 10, 110, WEIGHT_MIN_KG, 'upcoming'),
    ],
  },
];

const contexts: Record<string, SessionContext> = {
  'seed-5': {
    weightKg: 2.0,
    report: { difficulty: 'moderate', pain: 2, discomfort: false },
    recommendation: recommendations[0],
  },
};

export const SEED_REHAB = {
  profile,
  schedule,
  weights,
  recommendations,
  reports,
  plans,
  contexts,
};
