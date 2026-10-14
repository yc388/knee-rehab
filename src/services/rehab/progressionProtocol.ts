import {
  WEIGHT_INCREMENT_KG,
  clampWeight,
  type DifficultyRating,
} from '@/types/rehab';

/**
 * ProgressionProtocol — a CONFIGURABLE, clinician-approved rule set.
 *
 * IMPORTANT (safety): this does NOT embody a universal, medically-validated
 * weight-progression formula. It is a transparent set of thresholds that a
 * physiotherapist is expected to review and adjust. Any numeric weight
 * suggestion it emits is only a *candidate for review* — it is never applied
 * automatically, and progression is gated behind explicit approval elsewhere.
 *
 * If `allowNumericSuggestion` is false, the protocol will classify the session
 * but will NOT propose a specific next weight (the UI then shows
 * "Pending Review").
 */
export interface ProgressionProtocol {
  /** Minimum good-rep completion fraction (0–1) to consider progression. */
  minCompletionForProgression: number;
  /** Minimum ROM consistency (0–100) to consider progression. */
  minConsistencyForProgression: number;
  /** Minimum smoothness (0–100) to consider progression. */
  minSmoothnessForProgression: number;
  /** Max acceptable reported pain (0–10) to consider progression. */
  maxPainForProgression: number;
  /** Reported pain (0–10) at/above which load reduction review is advised. */
  painReduceThreshold: number;
  /** Completion fraction (0–1) below which difficulty review is advised. */
  lowCompletionThreshold: number;
  /** Whether the protocol may propose a concrete next weight value. */
  allowNumericSuggestion: boolean;
  /** Weight step used ONLY when allowNumericSuggestion is true, kg. */
  incrementKg: number;
}

/**
 * A conservative DEFAULT protocol. These numbers are placeholders for a
 * clinician to confirm/replace — deliberately cautious, and numeric
 * suggestions are OFF by default so nothing proposes a specific load without a
 * clinician enabling it.
 */
export const DEFAULT_PROTOCOL: ProgressionProtocol = {
  minCompletionForProgression: 0.9,
  minConsistencyForProgression: 80,
  minSmoothnessForProgression: 75,
  maxPainForProgression: 2,
  painReduceThreshold: 6,
  lowCompletionThreshold: 0.6,
  allowNumericSuggestion: false,
  incrementKg: WEIGHT_INCREMENT_KG,
};

/** Inputs the protocol evaluates — a mix of measured + reported data. */
export interface ProtocolInput {
  completionFraction: number; // goodReps / targetReps (measured/calculated)
  consistency: number; // 0–100 (calculated)
  smoothness: number; // 0–100 (calculated)
  incompleteReps: number; // measured
  pain: number | null; // 0–10 (reported) — null if not provided
  discomfort: boolean | null; // reported
  difficulty: DifficultyRating | null; // reported
  dataReliable: boolean; // link quality / enough samples
  currentKg: number;
}

export type Outcome = 'consider-increase' | 'maintain' | 'review-reduce';

export interface ProtocolResult {
  outcome: Outcome;
  /** Candidate next weight for review, or null if not permitted/appropriate. */
  proposedKg: number | null;
  insufficientData: boolean;
  clinicalReviewRecommended: boolean;
  reason: string;
}

/**
 * Evaluate a session against the protocol. Returns a classification and, only
 * when the protocol allows it and all progression criteria are met, a candidate
 * next weight for clinician review.
 */
export function evaluateProtocol(
  input: ProtocolInput,
  protocol: ProgressionProtocol = DEFAULT_PROTOCOL
): ProtocolResult {
  // Reliability / sufficiency gate first.
  if (!input.dataReliable) {
    return {
      outcome: 'review-reduce',
      proposedKg: null,
      insufficientData: true,
      clinicalReviewRecommended: true,
      reason:
        'Sensor data for this session was insufficient or unreliable, so progression cannot be assessed.',
    };
  }

  // Concerning symptoms → reduce/review (never auto-reduce the actual load).
  const painConcern =
    input.pain !== null && input.pain >= protocol.painReduceThreshold;
  const discomfortConcern = input.discomfort === true;
  if (painConcern || discomfortConcern) {
    return {
      outcome: 'review-reduce',
      proposedKg: null,
      insufficientData: false,
      clinicalReviewRecommended: true,
      reason: painConcern
        ? `Reported pain (${input.pain}/10) is at or above the review threshold.`
        : 'Unusual discomfort or instability was reported.',
    };
  }

  // Clearly struggling → difficulty review.
  if (input.completionFraction < protocol.lowCompletionThreshold) {
    return {
      outcome: 'review-reduce',
      proposedKg: null,
      insufficientData: false,
      clinicalReviewRecommended: true,
      reason:
        'The target range of motion / repetitions were not met for most repetitions.',
    };
  }

  // Progression criteria — ALL must hold.
  const meetsProgression =
    input.completionFraction >= protocol.minCompletionForProgression &&
    input.consistency >= protocol.minConsistencyForProgression &&
    input.smoothness >= protocol.minSmoothnessForProgression &&
    (input.pain === null || input.pain <= protocol.maxPainForProgression) &&
    input.incompleteReps === 0;

  if (meetsProgression) {
    const proposedKg =
      protocol.allowNumericSuggestion
        ? clampWeight(input.currentKg + protocol.incrementKg)
        : null;
    return {
      outcome: 'consider-increase',
      proposedKg,
      insufficientData: false,
      clinicalReviewRecommended: false,
      reason:
        'Performance met the configured targets with acceptable reported symptoms.',
    };
  }

  // Otherwise maintain.
  return {
    outcome: 'maintain',
    proposedKg: null,
    insufficientData: false,
    clinicalReviewRecommended: false,
    reason:
      'Performance was acceptable but did not meet all configured progression criteria.',
  };
}
