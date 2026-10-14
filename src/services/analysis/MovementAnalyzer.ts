import type { SensorReading } from '@/types/sensor';
import type { MovementAnalysis, RepMetric } from '@/types/analysis';
import type { Exercise, SessionConfig } from '@/types/exercise';

/**
 * MovementAnalyzer — the modular inference interface.
 *
 * A concrete analyzer consumes a stream of sensor samples and produces a live
 * `MovementAnalysis`. Today the only implementation is the rule-based
 * `RuleBasedMovementAnalyzer` (a state machine using exercise-specific
 * thresholds). The same interface is designed to later accept a trained
 * time-series model (e.g. an LSTM/temporal CNN over windowed samples) without
 * changing the UI or the edge/cloud service wrappers.
 *
 * When no trained model is present, consumers should label the output as
 * "rule-based movement analysis", NOT a trained AI model.
 */
export interface MovementAnalyzer {
  /** Short identifier of the analysis method, e.g. 'rule-based-v1'. */
  readonly method: string;
  /** True only when backed by a trained ML model. */
  readonly isTrainedModel: boolean;

  /** Prepare for a new session. */
  reset(exercise: Exercise, config: SessionConfig): void;
  /** Feed one sample; returns the current live analysis. */
  process(reading: SensorReading): MovementAnalysis;
  /** All completed repetition metrics so far. */
  getRepMetrics(): RepMetric[];
}
