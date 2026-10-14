import type { SessionSummary } from '@/types/exercise';
import type {
  ScheduledSession,
  WeeklyMetricComparison,
  WeeklyRecommendation,
  WeeklyReport,
} from '@/types/rehab';

/**
 * Weekly rehabilitation analysis (rule-based).
 *
 * Produces a reproducible week-over-week comparison from STORED session
 * records, plus recommendations for clinical review. It is careful to:
 *  - only compare equivalent metrics,
 *  - flag comparisons as unreliable when data is thin,
 *  - distinguish genuine change from likely measurement variation,
 *  - never make diagnostic claims or auto-apply changes.
 */

/** Monday 00:00 of the week containing `date`. */
export function weekStartOf(date: Date): Date {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function inWeek(iso: string, start: Date): boolean {
  const t = new Date(iso).getTime();
  const end = start.getTime() + 7 * 24 * 3600 * 1000;
  return t >= start.getTime() && t < end;
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

/** Decide a trend, treating small changes as "stable" (measurement variation). */
function trendOf(
  prev: number | null,
  curr: number | null,
  opts: { higherIsBetter: boolean; noiseBand: number }
): WeeklyMetricComparison['trend'] {
  if (prev === null || curr === null) return 'insufficient';
  const diff = curr - prev;
  if (Math.abs(diff) <= opts.noiseBand) return 'stable';
  const improved = opts.higherIsBetter ? diff > 0 : diff < 0;
  return improved ? 'improved' : 'declined';
}

export interface WeeklyInput {
  weekStart: Date;
  sessions: SessionSummary[];
  schedule: ScheduledSession[];
  currentWeightKg: number;
  /** Average reported pain this/previous week (null if none). */
  painThisWeek: number | null;
  painPrevWeek: number | null;
}

export function generateWeeklyReport(input: WeeklyInput): WeeklyReport {
  const { weekStart, sessions, schedule } = input;
  const prevStart = new Date(weekStart.getTime() - 7 * 24 * 3600 * 1000);

  const thisWeek = sessions.filter((s) => inWeek(s.completedAt, weekStart));
  const prevWeek = sessions.filter((s) => inWeek(s.completedAt, prevStart));

  const scheduledThisWeek = schedule.filter(
    (s) => inWeek(s.dateTime, weekStart) && s.status !== 'rest'
  );
  const sessionsScheduled = scheduledThisWeek.length;
  const sessionsCompleted = scheduledThisWeek.filter(
    (s) => s.status === 'completed'
  ).length;
  const adherencePct =
    sessionsScheduled > 0
      ? Math.round((sessionsCompleted / sessionsScheduled) * 100)
      : 0;

  const enough = thisWeek.length >= 1;

  const avg = (list: SessionSummary[], pick: (s: SessionSummary) => number) =>
    list.length ? round1(mean(list.map(pick))) : null;

  const comparisons: WeeklyMetricComparison[] = [
    cmp('Average max knee flexion', '°', avg(prevWeek, (s) => s.maxFlexion), avg(thisWeek, (s) => s.maxFlexion), true, 3),
    cmp('Average range of motion', '°', avg(prevWeek, (s) => s.totalRangeOfMotion), avg(thisWeek, (s) => s.totalRangeOfMotion), true, 3),
    cmp(
      'Repetition completion rate',
      '%',
      completionRate(prevWeek),
      completionRate(thisWeek),
      true,
      5
    ),
    cmp('Movement consistency', '/100', avg(prevWeek, (s) => s.consistencyScore), avg(thisWeek, (s) => s.consistencyScore), true, 5),
    cmp('Average session duration', 's', durAvg(prevWeek), durAvg(thisWeek), false, 10),
    cmp('Reported pain', '/10', input.painPrevWeek, input.painThisWeek, false, 1),
  ];

  const recommendations = buildWeeklyRecommendations({
    comparisons,
    adherencePct,
    thisWeekCount: thisWeek.length,
    painThisWeek: input.painThisWeek,
  });

  return {
    id: `week-${weekStart.toISOString().slice(0, 10)}`,
    weekStart: weekStart.toISOString(),
    sessionsCompleted,
    sessionsScheduled,
    adherencePct,
    comparisons,
    recommendations,
    provenance: 'rule-based',
    insufficientData: !enough,
  };
}

function cmp(
  label: string,
  unit: string,
  previous: number | null,
  current: number | null,
  higherIsBetter: boolean,
  noiseBand: number
): WeeklyMetricComparison {
  const trend = trendOf(previous, current, { higherIsBetter, noiseBand });
  return {
    label,
    unit,
    previous,
    current,
    trend,
    reliable: previous !== null && current !== null,
  };
}

function completionRate(list: SessionSummary[]): number | null {
  if (!list.length) return null;
  const totalGood = list.reduce((a, s) => a + s.goodReps, 0);
  const totalTarget = list.reduce((a, s) => a + s.targetReps, 0);
  return totalTarget > 0 ? Math.round((totalGood / totalTarget) * 100) : null;
}

function durAvg(list: SessionSummary[]): number | null {
  if (!list.length) return null;
  return Math.round(mean(list.map((s) => s.durationMs)) / 1000);
}

function buildWeeklyRecommendations(p: {
  comparisons: WeeklyMetricComparison[];
  adherencePct: number;
  thisWeekCount: number;
  painThisWeek: number | null;
}): WeeklyRecommendation[] {
  const recs: WeeklyRecommendation[] = [];
  const byLabel = (l: string) => p.comparisons.find((c) => c.label === l);

  const pain = byLabel('Reported pain');
  const rom = byLabel('Average range of motion');
  const completion = byLabel('Repetition completion rate');

  if (p.thisWeekCount === 0) {
    recs.push({
      category: 'continue',
      headline: 'Not enough sessions this week',
      detail:
        'No completed sessions were recorded this week, so no reliable analysis is possible. Try to complete your scheduled sessions.',
      provenance: 'rule-based',
    });
    return recs;
  }

  if (pain && pain.trend === 'declined') {
    recs.push({
      category: 'review-pain',
      headline: 'Review pain or discomfort',
      detail:
        'Your reported discomfort has increased. Avoid automatic progression and request clinical review.',
      provenance: 'rule-based',
    });
  }

  if (completion && completion.current !== null && completion.current < 70) {
    recs.push({
      category: 'review-difficulty',
      headline: 'Review exercise difficulty',
      detail:
        'You have repeatedly struggled to meet the target range of motion. Your physiotherapist may wish to modify the exercise or target.',
      provenance: 'rule-based',
    });
  }

  // Stable, strong performance → suggest discussing progression.
  const strongStable =
    completion &&
    completion.current !== null &&
    completion.current >= 90 &&
    rom &&
    (rom.trend === 'stable' || rom.trend === 'improved') &&
    (!pain || pain.trend !== 'declined');
  if (strongStable) {
    recs.push({
      category: 'review-resistance',
      headline: 'Review resistance progression',
      detail:
        'Your performance has remained consistent across recent sessions. Consider discussing a resistance progression with your physiotherapist.',
      provenance: 'rule-based',
    });
  }

  if (recs.length === 0) {
    recs.push({
      category: 'continue',
      headline: 'Continue current plan',
      detail:
        'Your performance is stable and you are completing your scheduled exercises. Continue with the existing plan.',
      provenance: 'rule-based',
    });
  }

  return recs;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
