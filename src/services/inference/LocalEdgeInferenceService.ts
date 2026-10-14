import type { SensorReading } from '@/types/sensor';
import type {
  BackendAvailability,
  InferenceResult,
  InfrastructureStatus,
} from '@/types/analysis';
import type { Exercise, SessionConfig } from '@/types/exercise';
import { RuleBasedMovementAnalyzer } from '@/services/analysis/RuleBasedMovementAnalyzer';
import {
  type InferenceService,
  measureInference,
} from './InferenceService';

/**
 * LocalEdgeInferenceService — runs the movement analyzer locally, in the
 * browser ("the edge" closest to the patient). Timings are REAL: inference
 * time is measured with performance.now(); transmission time is ~0 because the
 * data never leaves the device.
 *
 * This is the fully-working baseline. It represents the "AI on RAN" idea at
 * prototype scale — analysis next to the device — and is labelled honestly as
 * local edge, not AI-RAN, until a real AI-RAN backend is confirmed.
 */
export class LocalEdgeInferenceService implements InferenceService {
  readonly infrastructure: InfrastructureStatus = 'local-edge';
  readonly simulated = false;
  availability: BackendAvailability = 'available';

  private analyzer = new RuleBasedMovementAnalyzer();
  private sensorStampAtSource = true;

  async checkAvailability(): Promise<BackendAvailability> {
    this.availability = 'available';
    return this.availability;
  }

  reset(exercise: Exercise, config: SessionConfig): void {
    this.analyzer.reset(exercise, config);
  }

  async infer(reading: SensorReading): Promise<InferenceResult> {
    const t0 = performance.now();
    const { analysis, inferenceMs } = measureInference(this.analyzer, reading);
    const totalMs = performance.now() - t0;

    // Sensor-to-feedback: the sample is timestamped at source, so we can
    // measure the age of the sample at the moment feedback is produced.
    const sensorToFeedbackMs = this.sensorStampAtSource
      ? Math.max(0, Date.now() - reading.timestamp)
      : null;

    return {
      analysis,
      timing: {
        location: 'local-edge',
        inferenceMs: round2(inferenceMs),
        transmissionMs: 0,
        totalMs: round2(totalMs),
        sensorToFeedbackMs:
          sensorToFeedbackMs === null ? null : round2(sensorToFeedbackMs),
        simulated: false,
      },
    };
  }

  getRepMetrics() {
    return this.analyzer.getRepMetrics();
  }

  getAnalyzer(): RuleBasedMovementAnalyzer {
    return this.analyzer;
  }

  describe(): string {
    return `${this.analyzer.method} · local edge (in-browser)`;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
