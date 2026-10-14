import type { SensorReading } from '@/types/sensor';
import type {
  BackendAvailability,
  InferenceResult,
  InfrastructureStatus,
} from '@/types/analysis';
import type { Exercise, SessionConfig } from '@/types/exercise';
import { RuleBasedMovementAnalyzer } from '@/services/analysis/RuleBasedMovementAnalyzer';
import { type InferenceService } from './InferenceService';

/**
 * CloudInferenceService — alternative remote inference backend.
 *
 * If a real endpoint URL is provided and reachable, samples are POSTed to it
 * and the REAL end-to-end round-trip time is measured. If no endpoint is
 * configured or it is unreachable, the service reports `unavailable` and, for
 * demonstration only, runs the SAME analyzer locally while adding a clearly
 * SIMULATED network delay. Every such result is flagged `simulated: true` so
 * the UI never presents it as a measured cloud result.
 *
 * This models the "distant cloud" scenario in the AI-RAN comparison: more
 * network distance → higher, more variable latency than local edge.
 */
export class CloudInferenceService implements InferenceService {
  readonly infrastructure: InfrastructureStatus = 'cloud';
  availability: BackendAvailability = 'checking';

  private endpoint: string | null;
  private analyzer = new RuleBasedMovementAnalyzer();
  private _simulated = true;

  constructor(endpoint?: string) {
    this.endpoint = endpoint ?? null;
  }

  get simulated(): boolean {
    return this._simulated;
  }

  async checkAvailability(): Promise<BackendAvailability> {
    if (!this.endpoint) {
      this._simulated = true;
      this.availability = 'unavailable';
      return this.availability;
    }
    this.availability = 'checking';
    try {
      const res = await fetch(`${this.endpoint}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        this._simulated = false;
        this.availability = 'available';
      } else {
        this._simulated = true;
        this.availability = 'unavailable';
      }
    } catch {
      this._simulated = true;
      this.availability = 'unavailable';
    }
    return this.availability;
  }

  reset(exercise: Exercise, config: SessionConfig): void {
    this.analyzer.reset(exercise, config);
  }

  async infer(reading: SensorReading): Promise<InferenceResult> {
    // Real cloud path (only when a reachable endpoint was confirmed).
    if (this.endpoint && !this._simulated) {
      const t0 = performance.now();
      try {
        const res = await fetch(`${this.endpoint}/infer`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(reading),
          signal: AbortSignal.timeout(6000),
        });
        const totalMs = performance.now() - t0;
        const body = (await res.json()) as {
          analysis: InferenceResult['analysis'];
          inferenceMs?: number;
        };
        const inferenceMs = body.inferenceMs ?? 0;
        return {
          analysis: body.analysis,
          timing: {
            location: 'cloud',
            inferenceMs: round2(inferenceMs),
            transmissionMs: round2(Math.max(0, totalMs - inferenceMs)),
            totalMs: round2(totalMs),
            sensorToFeedbackMs: round2(Math.max(0, Date.now() - reading.timestamp)),
            simulated: false,
          },
        };
      } catch {
        // Lost the endpoint mid-session: fall back to simulated below.
        this._simulated = true;
        this.availability = 'unavailable';
      }
    }

    // Simulated cloud path — clearly flagged. Same analysis, added network
    // delay representative of a distant cloud (higher + more variable).
    const simInference = 1.5 + Math.random() * 2.5; // ms of "model" time
    const simTransmission = 28 + Math.random() * 45; // ms round-trip
    const t0 = performance.now();
    const analysis = this.analyzer.process(reading);
    const realInference = performance.now() - t0;

    return {
      analysis,
      timing: {
        location: 'cloud',
        inferenceMs: round2(realInference + simInference),
        transmissionMs: round2(simTransmission),
        totalMs: round2(realInference + simInference + simTransmission),
        sensorToFeedbackMs: null,
        simulated: true,
      },
    };
  }

  getRepMetrics() {
    return this.analyzer.getRepMetrics();
  }

  describe(): string {
    return this._simulated
      ? `${this.analyzer.method} · cloud (simulated network)`
      : `remote model · cloud (${this.endpoint})`;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
