/**
 * Movement-analysis and edge-inference type contracts.
 *
 * These describe the output of the movement-analysis engine and the inference
 * services (local edge / cloud / future AI-RAN). The engine is rule-based
 * today; the same interfaces are designed to accept a trained time-series
 * model later without changing the UI.
 */

/** The phase of a repetition the knee is currently in. */
export type MovementPhase =
  | 'ready' // resting at the start position, waiting to begin
  | 'concentric' // travelling towards the target (e.g. extending / flexing)
  | 'hold' // at/near the target peak
  | 'eccentric' // returning towards the start
  | 'rest'; // brief pause between reps

/** How a completed (or attempted) repetition was classified. */
export type RepClassification =
  | 'good' // full range, controlled
  | 'incomplete' // did not reach the target range
  | 'too-fast' // movement exceeded the safe/controlled speed
  | 'inconsistent'; // pace/ROM differed markedly from prior reps

/** Qualitative range-of-motion assessment for the current/last rep. */
export type RomAssessment = 'below-target' | 'near-target' | 'at-target' | 'exceeds-target';

/**
 * The analyser's live output, emitted continuously while an exercise runs.
 * Every field is derived from actual processed sensor samples.
 */
export interface MovementAnalysis {
  /** Current repetition phase. */
  phase: MovementPhase;
  /** Completed-repetition count. */
  reps: number;
  /** Successfully-completed ("good") repetitions. */
  goodReps: number;
  /** Repetitions detected but flagged incomplete. */
  incompleteReps: number;
  /** Current range of motion covered in the active rep, degrees. */
  currentRom: number;
  /** Smoothed knee angle used for analysis, degrees. */
  smoothedAngle: number;
  /** Smoothed angular speed magnitude, degrees/second. */
  speed: number;
  /** Movement smoothness 0–100 (100 = very smooth). */
  smoothness: number;
  /** Consistency of ROM across reps so far, 0–100. */
  consistency: number;
  /** ROM assessment relative to the configured target. */
  romAssessment: RomAssessment;
  /** Classification of the most recently completed repetition, if any. */
  lastRepClassification: RepClassification | null;
  /** Human-readable, evidence-based feedback cue for the patient. */
  feedback: string;
  /** True on the sample that completed a repetition (one-shot flag). */
  repJustCompleted: boolean;
  /** True once the configured target rep count is reached. */
  targetReached: boolean;
}

/** A single completed repetition's measured metrics. */
export interface RepMetric {
  index: number;
  classification: RepClassification;
  peakFlexion: number;
  peakExtension: number;
  rangeOfMotion: number;
  durationMs: number;
  /** Mean absolute speed during the rep, deg/s. */
  meanSpeed: number;
  /** Smoothness score for this rep, 0–100. */
  smoothness: number;
}

/** Where inference ran for a given result. */
export type ProcessingLocation = 'local-edge' | 'cloud' | 'ai-ran-edge' | 'simulation';

/** The analysis backend currently selected. */
export type InferenceMode = 'edge' | 'cloud';

/**
 * The inference backend's confirmed infrastructure. `ai-ran-edge` is only ever
 * reported when a compatible AI-RAN backend has actually been confirmed —
 * never claimed for the local prototype.
 */
export type InfrastructureStatus =
  | 'local-edge'
  | 'cloud'
  | 'ai-ran-edge'
  | 'simulation';

/** Timing + provenance returned alongside each inference result. */
export interface InferenceTiming {
  /** Where the inference actually ran. */
  location: ProcessingLocation;
  /** Pure model/rule inference time, milliseconds (measured). */
  inferenceMs: number;
  /** Data transmission round-trip time, milliseconds (measured). */
  transmissionMs: number;
  /** Total processing time as observed by the app, milliseconds (measured). */
  totalMs: number;
  /**
   * Sensor-to-feedback latency where the transport timestamps samples at the
   * source; null when not measurable.
   */
  sensorToFeedbackMs: number | null;
  /** True when any part of this timing is simulated rather than measured. */
  simulated: boolean;
}

/** One inference backend's result + timing, used by the comparison panel. */
export interface InferenceResult {
  analysis: MovementAnalysis;
  timing: InferenceTiming;
}

/** Whether a backend is reachable/available. */
export type BackendAvailability = 'available' | 'unavailable' | 'checking';

/** A rolling summary of latency measurements for one backend. */
export interface LatencyStats {
  location: ProcessingLocation;
  availability: BackendAvailability;
  samples: number;
  /** Mean total processing time, ms. Null if no measurements yet. */
  meanTotalMs: number | null;
  meanInferenceMs: number | null;
  meanTransmissionMs: number | null;
  lastTotalMs: number | null;
  /** True if the figures are simulated (backend not actually connected). */
  simulated: boolean;
}
