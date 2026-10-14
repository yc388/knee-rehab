import type {
  Exercise,
  SessionConfig,
  SessionSummary,
  AngleSample,
} from '@/types/exercise';
import type { RepMetric, ProcessingLocation } from '@/types/analysis';

export interface SessionMetricsInput {
  exercise: Exercise;
  config: SessionConfig;
  reps: RepMetric[];
  durationMs: number;
  angleTrace: AngleSample[];
  speedSamples: number[];
  processingLocation: ProcessingLocation;
}

/**
 * Compute the full session summary — metrics, custom scores and plain-language
 * feedback — from the analyser's per-rep metrics and the angle trace.
 *
 * Scores here are CUSTOM movement-quality indicators, not clinical measures.
 * How each is derived is documented inline (and surfaced in the UI).
 */
export function computeSessionSummary(
  input: SessionMetricsInput
): SessionSummary {
  const { exercise, config, reps, durationMs, angleTrace, speedSamples } = input;

  const allAngles = angleTrace.map((s) => s.angle);
  const maxFlexion = allAngles.length ? Math.max(...allAngles) : 0;
  const maxExtension = allAngles.length ? Math.min(...allAngles) : 0;
  const totalRangeOfMotion = round1(maxFlexion - maxExtension);

  const flexion = exercise.direction === 'flexion';
  // Average of the "working" peak per rep (the end of range being trained).
  const averageKneeAngle = reps.length
    ? round1(
        mean(reps.map((r) => (flexion ? r.peakFlexion : r.peakExtension)))
      )
    : 0;

  const averageSpeed = speedSamples.length
    ? round1(mean(speedSamples.map(Math.abs)))
    : 0;

  const averageRepDurationMs = reps.length
    ? Math.round(mean(reps.map((r) => r.durationMs)))
    : 0;

  const goodReps = reps.filter((r) => r.classification === 'good').length;
  const incompleteReps = reps.filter(
    (r) => r.classification === 'incomplete'
  ).length;

  const consistencyScore = computeConsistency(reps);
  const smoothnessScore = reps.length
    ? Math.round(mean(reps.map((r) => r.smoothness)))
    : 0;

  const expectedRom = Math.abs(config.targetAngle - exercise.repConfig.startAngle);
  const overallScore = computeOverall({
    goodReps,
    targetReps: config.targetReps,
    consistency: consistencyScore,
    smoothness: smoothnessScore,
    achievedRom: totalRangeOfMotion,
    expectedRom,
  });

  const { feedback, improvement } = buildFeedback({
    exercise,
    config,
    reps,
    goodReps,
    incompleteReps,
    consistencyScore,
    totalRangeOfMotion,
    expectedRom,
  });

  return {
    id: `session-${Date.now()}`,
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    completedAt: new Date().toISOString(),
    repsCompleted: reps.length,
    goodReps,
    incompleteReps,
    targetReps: config.targetReps,
    maxFlexion: round1(maxFlexion),
    maxExtension: round1(maxExtension),
    averageKneeAngle,
    totalRangeOfMotion,
    averageSpeed,
    averageRepDurationMs,
    durationMs,
    consistencyScore,
    smoothnessScore,
    overallScore,
    feedback,
    improvement,
    processingLocation: input.processingLocation,
    reps,
    angleTrace,
  };
}

/** Consistency: similarity of per-rep ROM. 100 = identical ROM each rep. */
function computeConsistency(reps: RepMetric[]): number {
  if (reps.length < 2) return reps.length === 1 ? 100 : 0;
  const roms = reps.map((r) => r.rangeOfMotion);
  const m = mean(roms);
  if (m === 0) return 0;
  const sd = Math.sqrt(mean(roms.map((r) => (r - m) ** 2)));
  const cv = sd / m;
  return Math.round(clamp(100 - cv * 250, 0, 100));
}

/**
 * Overall custom score (0–100): a transparent weighted blend of
 *   completion of GOOD reps (40%), achieved ROM vs target (25%),
 *   consistency (20%) and smoothness (15%).
 */
function computeOverall(p: {
  goodReps: number;
  targetReps: number;
  consistency: number;
  smoothness: number;
  achievedRom: number;
  expectedRom: number;
}): number {
  const completion = clamp(p.goodReps / Math.max(p.targetReps, 1), 0, 1);
  const romRatio = p.expectedRom > 0 ? clamp(p.achievedRom / p.expectedRom, 0, 1) : 1;
  const score =
    completion * 40 +
    romRatio * 25 +
    (p.consistency / 100) * 20 +
    (p.smoothness / 100) * 15;
  return Math.round(clamp(score, 0, 100));
}

function buildFeedback(p: {
  exercise: Exercise;
  config: SessionConfig;
  reps: RepMetric[];
  goodReps: number;
  incompleteReps: number;
  consistencyScore: number;
  totalRangeOfMotion: number;
  expectedRom: number;
}): { feedback: string; improvement: string } {
  const flexion = p.exercise.direction === 'flexion';

  let feedback: string;
  if (p.goodReps >= p.config.targetReps && p.consistencyScore >= 80) {
    feedback =
      'Great session. Your range of motion was consistent across most repetitions.';
  } else if (p.reps.length >= p.config.targetReps) {
    feedback =
      'Target repetition count achieved. Keep working on smooth, complete movements.';
  } else if (p.reps.length > 0) {
    feedback = `Good effort. You completed ${p.goodReps} good of ${p.reps.length} detected repetitions.`;
  } else {
    feedback =
      'Session recorded. Try to complete the full movement so repetitions can be counted.';
  }

  let improvement: string;
  const romRatio = p.expectedRom > 0 ? p.totalRangeOfMotion / p.expectedRom : 1;
  if (p.incompleteReps > 0) {
    improvement = flexion
      ? 'Several repetitions were incomplete — aim to bend a little closer to your target angle.'
      : 'Several repetitions were incomplete — aim to straighten a little closer to your target angle.';
  } else if (romRatio < 0.85) {
    improvement = flexion
      ? 'Try to bend your knee a little further to reach your configured target.'
      : 'Try to reach slightly more extension to meet your configured target.';
  } else if (p.consistencyScore < 70) {
    improvement =
      'Aim for a steadier pace so each repetition covers a similar range.';
  } else {
    improvement =
      'Keep up the controlled movement and consider adjusting your target when it feels easy.';
  }

  return { feedback, improvement };
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}
function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi);
}
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
