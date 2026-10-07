import type { RepetitionConfig, RepetitionRecord } from '@/types/exercise';

/**
 * RepetitionDetector — a small state machine that counts repetitions from a
 * stream of knee-angle values.
 *
 * The logic is deliberately simple and robust against sensor jitter:
 *
 *   START  → the knee is resting near `startAngle`.
 *   MOVING → the knee has left the start zone and is travelling towards target.
 *   PEAKED → the knee has reached the target zone (the top of the movement).
 *   (returns to the start zone) → a full repetition is counted.
 *
 * Hysteresis is provided by the start/target tolerance bands, and `minTravel`
 * guards against tiny fluctuations being mistaken for a movement. Because the
 * target may be either larger or smaller than the start (flexion vs extension
 * exercises), all comparisons are direction-agnostic.
 */
type Phase = 'start' | 'moving' | 'peaked';

export class RepetitionDetector {
  private config: RepetitionConfig;
  private phase: Phase = 'start';
  private reps: RepetitionRecord[] = [];

  // Metrics tracked for the current (in-progress) repetition.
  private repStartTime = 0;
  private repMinAngle = Number.POSITIVE_INFINITY;
  private repMaxAngle = Number.NEGATIVE_INFINITY;
  private reachedPeak = false;

  constructor(config: RepetitionConfig) {
    this.config = config;
  }

  /** Number of completed repetitions so far. */
  get count(): number {
    return this.reps.length;
  }

  /** All completed repetition records. */
  get records(): RepetitionRecord[] {
    return this.reps;
  }

  /** Reset the detector to its initial state. */
  reset(): void {
    this.phase = 'start';
    this.reps = [];
    this.resetRepMetrics();
  }

  /**
   * Feed a new knee-angle sample (degrees) with its timestamp (ms).
   * Returns `true` if this sample completed a repetition.
   */
  update(angle: number, timestamp: number): boolean {
    const { startAngle, targetAngle, startTolerance, targetTolerance, minTravel } =
      this.config;

    const inStartZone = Math.abs(angle - startAngle) <= startTolerance;
    const inTargetZone = Math.abs(angle - targetAngle) <= targetTolerance;
    const travelFromStart = Math.abs(angle - startAngle);

    // Always track per-rep extremes once a movement has begun.
    if (this.phase !== 'start') {
      this.repMinAngle = Math.min(this.repMinAngle, angle);
      this.repMaxAngle = Math.max(this.repMaxAngle, angle);
    }

    switch (this.phase) {
      case 'start': {
        // Begin a movement only after travelling meaningfully away from start.
        if (!inStartZone && travelFromStart >= minTravel * 0.5) {
          this.phase = 'moving';
          this.repStartTime = timestamp;
          this.repMinAngle = angle;
          this.repMaxAngle = angle;
          this.reachedPeak = false;
        }
        break;
      }
      case 'moving': {
        if (inTargetZone) {
          this.phase = 'peaked';
          this.reachedPeak = true;
        }
        break;
      }
      case 'peaked': {
        // Rep completes when we return to the start zone, provided the
        // movement actually covered enough ground.
        if (inStartZone && this.reachedPeak) {
          const travel = this.repMaxAngle - this.repMinAngle;
          if (travel >= minTravel) {
            this.completeRep(timestamp);
            this.phase = 'start';
            this.resetRepMetrics();
            return true;
          }
          // Not enough travel: discard and go back to resting.
          this.phase = 'start';
          this.resetRepMetrics();
        }
        break;
      }
    }

    return false;
  }

  private completeRep(timestamp: number): void {
    const peakFlexion = this.repMaxAngle;
    const peakExtension = this.repMinAngle;
    this.reps.push({
      index: this.reps.length + 1,
      peakFlexion: round1(peakFlexion),
      peakExtension: round1(peakExtension),
      rangeOfMotion: round1(peakFlexion - peakExtension),
      durationMs: timestamp - this.repStartTime,
    });
  }

  private resetRepMetrics(): void {
    this.repMinAngle = Number.POSITIVE_INFINITY;
    this.repMaxAngle = Number.NEGATIVE_INFINITY;
    this.reachedPeak = false;
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
