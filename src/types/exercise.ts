/**
 * Exercise domain types.
 */

export type DifficultyLevel = 'Easy' | 'Moderate' | 'Challenging';

/**
 * Thresholds used by the repetition-detection logic. Different exercises use
 * different ranges, so these are configurable per exercise.
 *
 * A repetition is detected when the knee angle travels from the "start" zone,
 * past the "target" zone, and back to the "start" zone. Hysteresis
 * (startZone/targetZone being bands rather than exact points) prevents small
 * sensor fluctuations from being counted as reps.
 */
export interface RepetitionConfig {
  /**
   * The resting / starting knee angle for the exercise, in degrees.
   * e.g. ~90° for Seated Knee Extension (sitting with knee bent).
   */
  startAngle: number;
  /**
   * The angle the knee should reach at the peak of the movement, in degrees.
   * e.g. ~20° for Seated Knee Extension (leg nearly straight).
   */
  targetAngle: number;
  /**
   * How close (in degrees) to `targetAngle` the knee must get to register that
   * the "peak" of the rep was reached.
   */
  targetTolerance: number;
  /**
   * How close (in degrees) to `startAngle` the knee must return to in order to
   * complete the rep.
   */
  startTolerance: number;
  /**
   * Minimum angular travel (degrees) between start and target. Guards against
   * tiny jitters being counted. Movements smaller than this are ignored.
   */
  minTravel: number;
}

/** A rehabilitation exercise definition. */
export interface Exercise {
  id: string;
  name: string;
  /** Emoji / icon used as a simple illustration. */
  icon: string;
  /** One-line description shown on the selection card. */
  shortDescription: string;
  /** Longer description shown on the instructions screen. */
  longDescription: string;
  /** Ordered step-by-step instructions. */
  steps: string[];
  /** A single safety reminder shown before the exercise. */
  safetyReminder: string;
  /** Recommended number of repetitions. */
  targetReps: number;
  /** Estimated duration in seconds (for display). */
  estimatedSeconds: number;
  difficulty: DifficultyLevel;
  /** Repetition-detection configuration for this exercise. */
  repConfig: RepetitionConfig;
}

/** Per-repetition metrics captured during a session. */
export interface RepetitionRecord {
  index: number;
  /** Peak flexion reached during the rep (max angle), degrees. */
  peakFlexion: number;
  /** Peak extension reached during the rep (min angle), degrees. */
  peakExtension: number;
  /** Range of motion for the rep (peakFlexion - peakExtension), degrees. */
  rangeOfMotion: number;
  /** Duration of the rep, in milliseconds. */
  durationMs: number;
}

/** A completed (or in-progress) exercise session summary. */
export interface SessionSummary {
  id: string;
  exerciseId: string;
  exerciseName: string;
  /** ISO date-time string of when the session finished. */
  completedAt: string;
  repsCompleted: number;
  targetReps: number;
  maxFlexion: number;
  maxExtension: number;
  totalRangeOfMotion: number;
  averageSpeed: number;
  durationMs: number;
  consistencyScore: number;
  overallScore: number;
  /** Positive feedback message. */
  feedback: string;
  /** Area-for-improvement message. */
  improvement: string;
  /** Down-sampled knee-angle trace for replaying the session graph. */
  angleTrace: AngleSample[];
}

/** A single point on the knee-angle-over-time trace. */
export interface AngleSample {
  /** Seconds since the start of the session. */
  t: number;
  /** Knee angle in degrees at time t. */
  angle: number;
}
