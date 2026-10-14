import type { SensorReading } from '@/types/sensor';
import type {
  MovementAnalysis,
  MovementPhase,
  RepClassification,
  RepMetric,
  RomAssessment,
} from '@/types/analysis';
import type { Exercise, SessionConfig } from '@/types/exercise';
import type { MovementAnalyzer } from './MovementAnalyzer';
import { AdaptiveAngleFilter } from '@/utils/signalFilter';

/**
 * RuleBasedMovementAnalyzer — a transparent, evidence-based state machine.
 *
 * It is NOT a trained ML model; every output is derived directly from measured
 * knee-angle samples using exercise-specific thresholds (with hysteresis so
 * sensor noise cannot double-count reps). Scope is deliberately limited to what
 * a single knee-angle sensor can actually support: repetitions, range of
 * motion, speed, smoothness, consistency, and completeness. It makes no claims
 * about posture, joint alignment, balance, or inter-limb symmetry.
 *
 * Phase machine (direction-agnostic):
 *   ready → concentric → hold → eccentric → (rep complete) → rest → ready
 */
export class RuleBasedMovementAnalyzer implements MovementAnalyzer {
  readonly method = 'rule-based-v1';
  readonly isTrainedModel = false;

  private ex!: Exercise;
  private cfg!: SessionConfig;
  private flexion = true; // target > start?

  private filter = new AdaptiveAngleFilter();
  private phase: MovementPhase = 'ready';
  private reps: RepMetric[] = [];

  // Smoothed state
  private lastSmoothed = 0;
  private lastTs = 0;
  private smoothedSpeed = 0;

  // Current-rep accumulators
  private repStartTs = 0;
  private repMin = Number.POSITIVE_INFINITY;
  private repMax = Number.NEGATIVE_INFINITY;
  private repReachedPeak = false;
  private repSpeedSamples: number[] = [];
  private repJerkSamples: number[] = [];
  private prevSpeed = 0;

  // Live smoothness (rolling)
  private liveSmoothness = 100;

  reset(exercise: Exercise, config: SessionConfig): void {
    this.ex = exercise;
    this.cfg = config;
    this.flexion = this.effectiveTarget() > exercise.repConfig.startAngle;
    this.filter.reset();
    this.phase = 'ready';
    this.reps = [];
    this.lastSmoothed = exercise.repConfig.startAngle;
    this.lastTs = 0;
    this.smoothedSpeed = 0;
    this.resetRepAccumulators();
    this.liveSmoothness = 100;
  }

  getRepMetrics(): RepMetric[] {
    return this.reps;
  }

  process(reading: SensorReading): MovementAnalysis {
    const now = reading.timestamp;
    const smoothed = this.filter.filter(reading.kneeAngle, now);

    // Derive speed from the smoothed signal for stability.
    const dt = this.lastTs ? Math.max((now - this.lastTs) / 1000, 1e-3) : 1e-3;
    const instSpeed = this.lastTs ? Math.abs(smoothed - this.lastSmoothed) / dt : 0;
    this.smoothedSpeed = 0.6 * instSpeed + 0.4 * this.smoothedSpeed;

    // Jerk (change in speed) feeds the smoothness metric.
    const jerk = Math.abs(instSpeed - this.prevSpeed);
    this.prevSpeed = instSpeed;

    const { startAngle, startTolerance, targetTolerance, minTravel } =
      this.ex.repConfig;
    const target = this.effectiveTarget();

    const inStart = Math.abs(smoothed - startAngle) <= startTolerance;
    const inTarget = Math.abs(smoothed - target) <= targetTolerance;
    const travelFromStart = Math.abs(smoothed - startAngle);

    let repJustCompleted = false;

    // Track per-rep extremes once a movement has begun.
    if (this.phase !== 'ready' && this.phase !== 'rest') {
      this.repMin = Math.min(this.repMin, smoothed);
      this.repMax = Math.max(this.repMax, smoothed);
      this.repSpeedSamples.push(instSpeed);
      this.repJerkSamples.push(jerk);
    }

    switch (this.phase) {
      case 'ready':
      case 'rest': {
        if (!inStart && travelFromStart >= minTravel * 0.4) {
          this.phase = 'concentric';
          this.repStartTs = now;
          this.repMin = smoothed;
          this.repMax = smoothed;
          this.repReachedPeak = false;
          this.repSpeedSamples = [instSpeed];
          this.repJerkSamples = [jerk];
        }
        break;
      }
      case 'concentric': {
        if (inTarget) {
          this.phase = 'hold';
          this.repReachedPeak = true;
        }
        break;
      }
      case 'hold': {
        // Leaving the target zone back towards start → eccentric.
        if (!inTarget) this.phase = 'eccentric';
        break;
      }
      case 'eccentric': {
        if (inStart && this.repReachedPeak) {
          const travel = this.repMax - this.repMin;
          if (travel >= minTravel) {
            repJustCompleted = true;
            this.completeRep(now);
          }
          // Reset regardless; a sub-threshold travel is discarded.
          this.phase = 'rest';
          this.resetRepAccumulators();
        }
        break;
      }
    }

    // Live smoothness: penalise high jerk relative to current speed.
    const jerkPenalty = clamp(jerk / 25, 0, 1); // 25 deg/s^2 ~ noticeable
    this.liveSmoothness = clamp(
      0.9 * this.liveSmoothness + 0.1 * (100 - jerkPenalty * 100),
      0,
      100
    );

    this.lastSmoothed = smoothed;
    this.lastTs = now;

    const currentRom =
      this.repMax > this.repMin && this.phase !== 'ready' && this.phase !== 'rest'
        ? round1(this.repMax - this.repMin)
        : 0;

    const romAssessment = this.assessRom(smoothed, target);
    const lastRep = this.reps[this.reps.length - 1] ?? null;

    const analysis: MovementAnalysis = {
      phase: this.phase,
      reps: this.reps.length,
      goodReps: this.reps.filter((r) => r.classification === 'good').length,
      incompleteReps: this.reps.filter((r) => r.classification === 'incomplete')
        .length,
      currentRom,
      smoothedAngle: round1(smoothed),
      speed: round1(this.smoothedSpeed),
      smoothness: Math.round(this.liveSmoothness),
      consistency: this.consistency(),
      romAssessment,
      lastRepClassification: lastRep?.classification ?? null,
      feedback: this.feedback(romAssessment, repJustCompleted),
      repJustCompleted,
      targetReached: this.reps.length >= this.cfg.targetReps,
    };
    return analysis;
  }

  // ---- helpers ----

  private effectiveTarget(): number {
    return this.cfg?.targetAngle ?? this.ex.repConfig.targetAngle;
  }

  private completeRep(now: number): void {
    const peakFlexion = this.repMax;
    const peakExtension = this.repMin;
    const rom = peakFlexion - peakExtension;
    const meanSpeed = this.repSpeedSamples.length
      ? mean(this.repSpeedSamples)
      : 0;
    const maxSpeed = this.repSpeedSamples.length
      ? Math.max(...this.repSpeedSamples)
      : 0;
    const meanJerk = this.repJerkSamples.length ? mean(this.repJerkSamples) : 0;
    const smoothness = clamp(100 - meanJerk * 4, 0, 100);

    const target = this.effectiveTarget();
    const requiredTravel = Math.abs(target - this.ex.repConfig.startAngle);
    const reachedTarget = this.flexion
      ? peakFlexion >= target - this.ex.repConfig.targetTolerance
      : peakExtension <= target + this.ex.repConfig.targetTolerance;

    let classification: RepClassification = 'good';
    if (!reachedTarget || rom < requiredTravel * 0.8) {
      classification = 'incomplete';
    } else if (maxSpeed > this.ex.repConfig.maxControlledSpeed) {
      classification = 'too-fast';
    } else if (this.reps.length >= 1) {
      // Compare ROM to the running mean to flag inconsistency.
      const priorMean = mean(this.reps.map((r) => r.rangeOfMotion));
      if (priorMean > 0 && Math.abs(rom - priorMean) / priorMean > 0.35) {
        classification = 'inconsistent';
      }
    }

    this.reps.push({
      index: this.reps.length + 1,
      classification,
      peakFlexion: round1(peakFlexion),
      peakExtension: round1(peakExtension),
      rangeOfMotion: round1(rom),
      durationMs: now - this.repStartTs,
      meanSpeed: round1(meanSpeed),
      smoothness: Math.round(smoothness),
    });
  }

  private resetRepAccumulators(): void {
    this.repMin = Number.POSITIVE_INFINITY;
    this.repMax = Number.NEGATIVE_INFINITY;
    this.repReachedPeak = false;
    this.repSpeedSamples = [];
    this.repJerkSamples = [];
  }

  private assessRom(angle: number, target: number): RomAssessment {
    const tol = this.ex.repConfig.targetTolerance;
    if (this.flexion) {
      if (angle >= target + tol) return 'exceeds-target';
      if (angle >= target - tol) return 'at-target';
      if (angle >= target - 2 * tol) return 'near-target';
      return 'below-target';
    } else {
      if (angle <= target - tol) return 'exceeds-target';
      if (angle <= target + tol) return 'at-target';
      if (angle <= target + 2 * tol) return 'near-target';
      return 'below-target';
    }
  }

  private consistency(): number {
    if (this.reps.length < 2) return this.reps.length === 1 ? 100 : 0;
    const roms = this.reps.map((r) => r.rangeOfMotion);
    const m = mean(roms);
    if (m === 0) return 0;
    const sd = Math.sqrt(mean(roms.map((r) => (r - m) ** 2)));
    const cv = sd / m;
    return Math.round(clamp(100 - cv * 250, 0, 100));
  }

  /**
   * Evidence-based feedback. Only cues that a single knee-angle sensor can
   * actually support are produced.
   */
  private feedback(rom: RomAssessment, repJustCompleted: boolean): string {
    if (this.reps.length >= this.cfg.targetReps) {
      return 'Target repetition count achieved.';
    }
    if (repJustCompleted) {
      const last = this.reps[this.reps.length - 1];
      switch (last?.classification) {
        case 'good':
          return 'Good repetition. Target range reached.';
        case 'incomplete':
          return 'Incomplete repetition detected.';
        case 'too-fast':
          return 'Try to move more slowly.';
        case 'inconsistent':
          return 'Movement speed is inconsistent.';
      }
    }
    if (this.smoothedSpeed > this.ex.repConfig.maxControlledSpeed) {
      return 'Try to move more slowly.';
    }
    switch (this.phase) {
      case 'concentric':
        return this.flexion
          ? 'Bend towards your target angle.'
          : 'Extend towards your target angle.';
      case 'hold':
        return 'Hold briefly at the target.';
      case 'eccentric':
        return 'Maintain a controlled return movement.';
      default:
        if (rom === 'below-target') return 'Begin your next repetition.';
        return 'Ready — begin when you are set.';
    }
  }
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}
function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi);
}
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
