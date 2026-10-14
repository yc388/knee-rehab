import type { SessionSummary, AngleSample } from '@/types/exercise';
import type { RepMetric, RepClassification } from '@/types/analysis';

/**
 * Pre-seeded demo history so the Exercise History page and progress graph look
 * convincing out of the box. These are clearly demo sessions (processing
 * location 'simulation'). Stored on first run via the historyStore.
 */

function buildTrace(
  startAngle: number,
  targetAngle: number,
  reps: number,
  repPeriodSec = 4
): AngleSample[] {
  const samples: AngleSample[] = [];
  const totalSec = reps * repPeriodSec;
  const step = 0.2;
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

function buildReps(
  count: number,
  startAngle: number,
  targetAngle: number,
  flexion: boolean,
  romJitter = 4
): RepMetric[] {
  const reps: RepMetric[] = [];
  for (let i = 0; i < count; i++) {
    const peak = targetAngle + (Math.random() - 0.5) * romJitter;
    const base = startAngle + (Math.random() - 0.5) * 2;
    const peakFlexion = flexion ? peak : base;
    const peakExtension = flexion ? base : peak;
    const rom = Math.abs(peakFlexion - peakExtension);
    const classification: RepClassification = 'good';
    reps.push({
      index: i + 1,
      classification,
      peakFlexion: round1(peakFlexion),
      peakExtension: round1(peakExtension),
      rangeOfMotion: round1(rom),
      durationMs: 3800 + Math.round((Math.random() - 0.5) * 600),
      meanSpeed: round1(22 + Math.random() * 8),
      smoothness: 80 + Math.round(Math.random() * 15),
    });
  }
  return reps;
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
    exerciseId: 'leg-extension',
    exerciseName: 'Leg Extension',
    completedAt: daysAgo(9),
    repsCompleted: 10,
    goodReps: 8,
    incompleteReps: 2,
    targetReps: 10,
    maxFlexion: 91,
    maxExtension: 28,
    averageKneeAngle: 29,
    totalRangeOfMotion: 63,
    averageSpeed: 24,
    averageRepDurationMs: 4100,
    durationMs: 96_000,
    consistencyScore: 74,
    smoothnessScore: 79,
    overallScore: 71,
    feedback: 'Good effort. Your movements were steady throughout the session.',
    improvement:
      'Try to reach slightly more extension to meet your configured target.',
    processingLocation: 'simulation',
    reps: buildReps(10, 90, 28, false),
    angleTrace: buildTrace(90, 28, 10),
  },
  {
    id: 'seed-2',
    exerciseId: 'hamstring-curls',
    exerciseName: 'Hamstring Curls',
    completedAt: daysAgo(7),
    repsCompleted: 12,
    goodReps: 11,
    incompleteReps: 1,
    targetReps: 12,
    maxFlexion: 104,
    maxExtension: 11,
    averageKneeAngle: 101,
    totalRangeOfMotion: 93,
    averageSpeed: 29,
    averageRepDurationMs: 3900,
    durationMs: 100_000,
    consistencyScore: 83,
    smoothnessScore: 85,
    overallScore: 82,
    feedback: 'Well done — you completed every repetition with control.',
    improvement:
      'Keep up the controlled movement and consider adjusting your target when it feels easy.',
    processingLocation: 'simulation',
    reps: buildReps(12, 10, 104, true),
    angleTrace: buildTrace(10, 104, 12, 3.9),
  },
  {
    id: 'seed-3',
    exerciseId: 'leg-extension',
    exerciseName: 'Leg Extension',
    completedAt: daysAgo(5),
    repsCompleted: 10,
    goodReps: 9,
    incompleteReps: 1,
    targetReps: 10,
    maxFlexion: 93,
    maxExtension: 22,
    averageKneeAngle: 23,
    totalRangeOfMotion: 71,
    averageSpeed: 27,
    averageRepDurationMs: 4000,
    durationMs: 94_000,
    consistencyScore: 85,
    smoothnessScore: 86,
    overallScore: 84,
    feedback:
      'Great session. Your range of motion was consistent across most repetitions.',
    improvement: 'Aim for a steadier pace so each repetition covers a similar range.',
    processingLocation: 'simulation',
    reps: buildReps(10, 90, 22, false),
    angleTrace: buildTrace(90, 22, 10),
  },
  {
    id: 'seed-4',
    exerciseId: 'squat',
    exerciseName: 'Squat',
    completedAt: daysAgo(3),
    repsCompleted: 10,
    goodReps: 10,
    incompleteReps: 0,
    targetReps: 10,
    maxFlexion: 98,
    maxExtension: 10,
    averageKneeAngle: 94,
    totalRangeOfMotion: 88,
    averageSpeed: 31,
    averageRepDurationMs: 4200,
    durationMs: 104_000,
    consistencyScore: 88,
    smoothnessScore: 88,
    overallScore: 89,
    feedback:
      'Great session. Your range of motion was consistent across most repetitions.',
    improvement: 'Keep up the controlled movement and consider progressing.',
    processingLocation: 'simulation',
    reps: buildReps(10, 10, 98, true),
    angleTrace: buildTrace(10, 98, 10, 3.8),
  },
  {
    id: 'seed-5',
    exerciseId: 'sit-to-stand',
    exerciseName: 'Sit-to-Stand',
    completedAt: daysAgo(1),
    repsCompleted: 8,
    goodReps: 8,
    incompleteReps: 0,
    targetReps: 8,
    maxFlexion: 96,
    maxExtension: 14,
    averageKneeAngle: 15,
    totalRangeOfMotion: 82,
    averageSpeed: 29,
    averageRepDurationMs: 4300,
    durationMs: 94_000,
    consistencyScore: 87,
    smoothnessScore: 84,
    overallScore: 86,
    feedback:
      'Great session. Your range of motion was consistent across most repetitions.',
    improvement:
      'Keep up the controlled movement and consider adjusting your target when it feels easy.',
    processingLocation: 'simulation',
    reps: buildReps(8, 95, 14, false),
    angleTrace: buildTrace(95, 14, 8, 4.3),
  },
];

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
