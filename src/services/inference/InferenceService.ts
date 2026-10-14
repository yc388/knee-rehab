import type { SensorReading } from '@/types/sensor';
import type {
  BackendAvailability,
  InferenceResult,
  InfrastructureStatus,
} from '@/types/analysis';
import type { Exercise, SessionConfig } from '@/types/exercise';
import type { RepMetric } from '@/types/analysis';
import type { MovementAnalyzer } from '@/services/analysis/MovementAnalyzer';

/**
 * InferenceService — wraps a MovementAnalyzer with a *processing location*
 * (local edge, cloud, or — only when genuinely confirmed — AI-RAN edge) and
 * measures the real time each inference takes.
 *
 *   Sensors → Microcontroller → BLE/Wi-Fi → [InferenceService] → Dashboard
 *
 * The architecture is explicitly designed so that AI inference can later be
 * deployed on 5G AI-RAN edge infrastructure. The prototype runs the SAME
 * analyzer locally (local edge). A `CloudInferenceService` can POST samples to
 * a remote endpoint; if that endpoint is unreachable it reports `unavailable`
 * and any demo latency it shows is clearly flagged `simulated: true`.
 */
export interface InferenceService {
  /** The infrastructure this backend represents. */
  readonly infrastructure: InfrastructureStatus;
  /** Current reachability of the backend. */
  readonly availability: BackendAvailability;
  /** True when latency numbers are simulated rather than measured. */
  readonly simulated: boolean;

  /** Probe whether the backend is reachable. */
  checkAvailability(): Promise<BackendAvailability>;
  /** Prepare for a session. */
  reset(exercise: Exercise, config: SessionConfig): void;
  /** Run inference on a sample, returning analysis + measured timing. */
  infer(reading: SensorReading): Promise<InferenceResult>;
  /** Completed repetition metrics for the current session. */
  getRepMetrics(): RepMetric[];
  /** Human-readable method label, e.g. 'rule-based-v1 (local edge)'. */
  describe(): string;
}

/** Shared helper to run the analyzer and measure inference time precisely. */
export function measureInference(
  analyzer: MovementAnalyzer,
  reading: SensorReading
): { analysis: ReturnType<MovementAnalyzer['process']>; inferenceMs: number } {
  const t0 = performance.now();
  const analysis = analyzer.process(reading);
  const inferenceMs = performance.now() - t0;
  return { analysis, inferenceMs };
}
