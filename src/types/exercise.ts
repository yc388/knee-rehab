/**
 * Exercise domain types.
 */

import type { RepClassification, RepMetric, ProcessingLocation } from '@/types/analysis';

export type DifficultyLevel = 'Easy' | 'Moderate' | 'Challenging';

/**
 * Which direction the knee's "effort" peak lies in, relative to the start.
 * - `flexion`   : the target angle is LARGER than the start (knee bends more).
 * - `extension` : the target angle is SMALLER than the start (knee straightens).
 * Used by the analyser to label phases and feedback correctly.
 */
export type MovementDirection = 'flexion' | 'extension';

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
  /** Resting / starting knee angle for the exercise, degrees. */
  startAngle: number;
  /** Angle the knee should reach at the peak of the movement, degrees. */
  targetAngle: number;
  /** How close to `targetAngle` (deg) counts as reaching the peak. */
  targetTolerance: number;
  /** How close to `startAngle` (deg) counts as returning to the start. */
  startTolerance: number;
  /** Minimum angular travel (deg) between start and target to count a rep. */
  minTravel: number;
  /**
   * Speed (deg/s) above which a movement is flagged as "too fast".
   * Exercise-specific because squats and leg extensions differ.
   */
  maxControlledSpeed: number;
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
  /** Recommended number of repetitions (default; user-configurable). */
  targetReps: number;
  /** Estimated duration in seconds (for display). */
  estimatedSeconds: number;
  difficulty: DifficultyLevel;
  /** Which way the effort peak lies relative to the start position. */
  direction: MovementDirection;
  /** Repetition-detection + analysis configuration for this exercise. */
  repConfig: RepetitionConfig;
}

/**
 * Per-session, user-adjustable overrides. The platform does not assume one
 * rehab target is appropriate for every patient, so target angle and rep count
 * can be configured before each session.
 */
export interface SessionConfig {
  targetReps: number;
  /** Overrides repConfig.targetAngle for this session. */
  targetAngle: number;
}

/** Default session config derived from an exercise definition. */
export function defaultSessionConfig(ex: Exercise): SessionConfig {
  return { targetReps: ex.targetReps, targetAngle: ex.repConfig.targetAngle };
}

/** Per-repetition metrics captured during a session (legacy-compatible). */
export interface RepetitionRecord {
  index: number;
  peakFlexion: number;
  peakExtension: number;
  rangeOfMotion: number;
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
  /** Successfully-completed ("good") repetitions. */
  goodReps: number;
  /** Repetitions detected but flagged incomplete. */
  incompleteReps: number;
  targetReps: number;
  maxFlexion: number;
  maxExtension: number;
  /** Average of the per-rep peak angles (flexion-direction), degrees. */
  averageKneeAngle: number;
  totalRangeOfMotion: number;
  averageSpeed: number;
  /** Average repetition duration, milliseconds. */
  averageRepDurationMs: number;
  durationMs: number;
  consistencyScore: number;
  /** Movement smoothness metric 0–100. */
  smoothnessScore: number;
  overallScore: number;
  /** Positive feedback message. */
  feedback: string;
  /** Area-for-improvement message. */
  improvement: string;
  /** Where analysis ran for this session. */
  processingLocation: ProcessingLocation;
  /** Per-rep breakdown. */
  reps: RepMetric[];
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

export type { RepClassification };
