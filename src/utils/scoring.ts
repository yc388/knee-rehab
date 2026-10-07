import type {
  Exercise,
  RepetitionRecord,
  SessionSummary,
  AngleSample,
} from '@/types/exercise';

export interface SessionMetricsInput {
  exercise: Exercise;
  reps: RepetitionRecord[];
  durationMs: number;
  /** All angle samples collected during the session. */
  angleTrace: AngleSample[];
  /** Peak absolute angular velocities observed (deg/s), for average speed. */
  speedSamples: number[];
}

/**
 * Compute the full session summary — metrics, scores and plain-language
 * feedback — from the raw per-rep and trace data.
 */
export function computeSessionSummary(
  input: SessionMetricsInput
): SessionSummary {
  const { exercise, reps, durationMs, angleTrace, speedSamples } = input;

  const allAngles = angleTrace.map((s) => s.angle);
  const maxFlexion = allAngles.length ? Math.max(...allAngles) : 0;
  const maxExtension = allAngles.length ? Math.min(...allAngles) : 0;
  const totalRangeOfMotion = round1(maxFlexion - maxExtension);

  const averageSpeed = speedSamples.length
    ? round1(mean(speedSamples.map(Math.abs)))
    : 0;

  const consistencyScore = computeConsistency(reps);
  const overallScore = computeOverall({
    reps: reps.length,
    targetReps: exercise.targetReps,
    consistency: consistencyScore,
    achievedRom: totalRangeOfMotion,
    expectedRom: Math.abs(exercise.repConfig.targetAngle - exercise.repConfig.startAngle),
  });

  const { feedback, improvement } = buildFeedback({
    exercise,
    reps,
    consistencyScore,
    maxFlexion,
    maxExtension,
    totalRangeOfMotion,
  });

  return {
    id: `session-${Date.now()}`,
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    completedAt: new Date().toISOString(),
    repsCompleted: reps.length,
    targetReps: exercise.targetReps,
    maxFlexion: round1(maxFlexion),
    maxExtension: round1(maxExtension),
    totalRangeOfMotion,
    averageSpeed,
    durationMs,
    consistencyScore,
    overallScore,
    feedback,
    improvement,
    angleTrace,
  };
}

/**
 * Consistency: how similar the per-rep range of motion is across reps.
 * Expressed 0–100, where 100 means every rep covered an identical ROM.
 */
function computeConsistency(reps: RepetitionRecord[]): number {
  if (reps.length < 2) return reps.length === 1 ? 100 : 0;
  const roms = reps.map((r) => r.rangeOfMotion);
  const m = mean(roms);
  if (m === 0) return 0;
  const variance = mean(roms.map((r) => (r - m) ** 2));
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = stdDev / m;
  // CV of 0 -> 100; CV of 0.4+ -> ~0.
  const score = Math.max(0, 100 - coefficientOfVariation * 250);
  return Math.round(clamp(score, 0, 100));
}

function computeOverall(params: {
  reps: number;
  targetReps: number;
  consistency: number;
  achievedRom: number;
  expectedRom: number;
}): number {
  const { reps, targetReps, consistency, achievedRom, expectedRom } = params;
  // Completion of target reps (0–1).
  const completion = clamp(reps / Math.max(targetReps, 1), 0, 1);
  // How much of the expected ROM was achieved (0–1, capped at 1).
  const romRatio = expectedRom > 0 ? clamp(achievedRom / expectedRom, 0, 1) : 1;

  // Weighted blend: completion 40%, ROM 35%, consistency 25%.
  const score =
    completion * 40 + romRatio * 35 + (consistency / 100) * 25;
  return Math.round(clamp(score, 0, 100));
}

function buildFeedback(params: {
  exercise: Exercise;
  reps: RepetitionRecord[];
  consistencyScore: number;
  maxFlexion: number;
  maxExtension: number;
  totalRangeOfMotion: number;
}): { feedback: string; improvement: string } {
  const { exercise, reps, consistencyScore, totalRangeOfMotion } = params;
  const expectedRom = Math.abs(
    exercise.repConfig.targetAngle - exercise.repConfig.startAngle
  );
  const flexionExercise =
    exercise.repConfig.targetAngle > exercise.repConfig.startAngle;

  let feedback: string;
  if (reps.length >= exercise.targetReps && consistencyScore >= 80) {
    feedback =
      'Great session. Your range of motion was consistent across most repetitions.';
  } else if (reps.length >= exercise.targetReps) {
    feedback =
      'Well done — you completed every repetition. Keep working on smooth, even movements.';
  } else if (reps.length > 0) {
    feedback = `Good effort. You completed ${reps.length} of ${exercise.targetReps} repetitions.`;
  } else {
    feedback =
      'Session recorded. Try to complete the full movement so repetitions can be counted.';
  }

  let improvement: string;
  const romRatio = expectedRom > 0 ? totalRangeOfMotion / expectedRom : 1;
  if (romRatio < 0.85) {
    improvement = flexionExercise
      ? 'Try to bend your knee a little further during your next session.'
      : 'Try to reach slightly more extension during your next session.';
  } else if (consistencyScore < 70) {
    improvement =
      'Aim for a steadier pace so each repetition covers a similar range.';
  } else {
    improvement =
      'Keep up the controlled movement and consider progressing when it feels easy.';
  }

  return { feedback, improvement };
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
