import type {
  InferenceTiming,
  LatencyStats,
  ProcessingLocation,
  BackendAvailability,
} from '@/types/analysis';

/**
 * Accumulates rolling latency statistics per processing location so the
 * comparison panel can show MEASURED means. Simulated contributions keep the
 * `simulated` flag set so the UI can label them.
 */
export class LatencyTracker {
  private byLocation = new Map<ProcessingLocation, Accumulator>();

  record(timing: InferenceTiming): void {
    const acc = this.byLocation.get(timing.location) ?? newAccumulator();
    acc.samples += 1;
    acc.sumTotal += timing.totalMs;
    acc.sumInference += timing.inferenceMs;
    acc.sumTransmission += timing.transmissionMs;
    acc.lastTotal = timing.totalMs;
    acc.simulated = acc.simulated || timing.simulated;
    this.byLocation.set(timing.location, acc);
  }

  stats(
    location: ProcessingLocation,
    availability: BackendAvailability
  ): LatencyStats {
    const acc = this.byLocation.get(location);
    if (!acc || acc.samples === 0) {
      return {
        location,
        availability,
        samples: 0,
        meanTotalMs: null,
        meanInferenceMs: null,
        meanTransmissionMs: null,
        lastTotalMs: null,
        simulated: false,
      };
    }
    return {
      location,
      availability,
      samples: acc.samples,
      meanTotalMs: round2(acc.sumTotal / acc.samples),
      meanInferenceMs: round2(acc.sumInference / acc.samples),
      meanTransmissionMs: round2(acc.sumTransmission / acc.samples),
      lastTotalMs: round2(acc.lastTotal),
      simulated: acc.simulated,
    };
  }

  reset(): void {
    this.byLocation.clear();
  }
}

interface Accumulator {
  samples: number;
  sumTotal: number;
  sumInference: number;
  sumTransmission: number;
  lastTotal: number;
  simulated: boolean;
}

function newAccumulator(): Accumulator {
  return {
    samples: 0,
    sumTotal: 0,
    sumInference: 0,
    sumTransmission: 0,
    lastTotal: 0,
    simulated: false,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
