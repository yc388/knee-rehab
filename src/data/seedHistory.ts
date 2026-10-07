import type { SessionSummary, AngleSample } from '@/types/exercise';

/**
 * Pre-seeded demo history so the Exercise History page and progress graph look
 * convincing out of the box. Stored on first run via the historyStore.
 */

/** Build a smooth demo angle trace oscillating between two angles. */
function buildTrace(
  startAngle: number,
  targetAngle: number,
  reps: number,
  repPeriodSec = 4
): AngleSample[] {
  const samples: AngleSample[] = [];
  const totalSec = reps * repPeriodSec;
  const step = 0.2; // 5 Hz for a compact stored trace
  const span = targetAngle - startAngle;
  for (let t = 0; t <= totalSec; t += step) {
    const phase = (t % repPeriodSec) / repPeriodSec;
    const eased = 0.5 - 0.5 * Math.cos(phase * 2 * Math.PI);
    const noise = 0.6 * Math.sin(t * 3.3) + 0.3 * Math.sin(t * 8.1);
    samples.push({
      t: Math.round(t * 10) / 10,
      angle: Math.round((startAngle + span * eased + noise) * 10) / 10,
    });
  }
  return samples;
}

function daysAgo(days: number, hour = 10): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 15, 0, 0);
  return d.toISOString();
}

export const SEED_SESSIONS: SessionSummary[] = [
  {
    id: 'seed-1',
    exerciseId: 'seated-knee-extension',
    exerciseName: 'Seated Knee Extension',
    completedAt: daysAgo(9),
    repsCompleted: 10,
    targetReps: 10,
    maxFlexion: 91,
    maxExtension: 28,
    totalRangeOfMotion: 63,
    averageSpeed: 24,
    durationMs: 96_000,
    consistencyScore: 74,
    overallScore: 72,
    feedback: 'Good effort. Your movements were steady throughout the session.',
    improvement: 'Try to reach slightly more extension during your next session.',
    angleTrace: buildTrace(90, 28, 10),
  },
  {
    id: 'seed-2',
    exerciseId: 'straight-leg-raise',
    exerciseName: 'Straight Leg Raise',
    completedAt: daysAgo(7),
    repsCompleted: 10,
    targetReps: 10,
    maxFlexion: 46,
    maxExtension: 4,
    totalRangeOfMotion: 42,
    averageSpeed: 19,
    durationMs: 92_000,
    consistencyScore: 83,
    overallScore: 81,
    feedback: 'Well done — you completed every repetition with control.',
    improvement: 'Keep up the controlled movement and progress when it feels easy.',
    angleTrace: buildTrace(5, 45, 10, 4.5),
  },
  {
    id: 'seed-3',
    exerciseId: 'seated-knee-extension',
    exerciseName: 'Seated Knee Extension',
    completedAt: daysAgo(5),
    repsCompleted: 10,
    targetReps: 10,
    maxFlexion: 93,
    maxExtension: 22,
    totalRangeOfMotion: 71,
    averageSpeed: 27,
    durationMs: 94_000,
    consistencyScore: 85,
    overallScore: 83,
    feedback: 'Great session. Your range of motion was consistent across most repetitions.',
    improvement: 'Aim for a steadier pace so each repetition covers a similar range.',
    angleTrace: buildTrace(90, 22, 10),
  },
  {
    id: 'seed-4',
    exerciseId: 'standing-knee-flexion',
    exerciseName: 'Standing Knee Flexion',
    completedAt: daysAgo(3),
    repsCompleted: 12,
    targetReps: 12,
    maxFlexion: 108,
    maxExtension: 11,
    totalRangeOfMotion: 97,
    averageSpeed: 31,
    durationMs: 104_000,
    consistencyScore: 88,
    overallScore: 87,
    feedback: 'Great session. Your range of motion was consistent across most repetitions.',
    improvement: 'Keep up the controlled movement and consider progressing.',
    angleTrace: buildTrace(10, 110, 12, 3.8),
  },
  {
    id: 'seed-5',
    exerciseId: 'seated-knee-extension',
    exerciseName: 'Seated Knee Extension',
    completedAt: daysAgo(1),
    repsCompleted: 10,
    targetReps: 10,
    maxFlexion: 94,
    maxExtension: 18,
    totalRangeOfMotion: 76,
    averageSpeed: 29,
    durationMs: 94_000,
    consistencyScore: 87,
    overallScore: 85,
    feedback: 'Great session. Your range of motion was consistent across most repetitions.',
    improvement: 'Try to reach slightly more extension during your next session.',
    angleTrace: buildTrace(90, 18, 10),
  },
];
