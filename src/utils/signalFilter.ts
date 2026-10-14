/**
 * Signal filtering for noisy sensor readings.
 *
 * A one-euro-style low-pass filter: it smooths jitter when the signal is slow
 * but tracks quickly during fast movements, so repetitions are not lagged.
 * Falls back to a plain exponential moving average when configured simply.
 */
export class LowPassFilter {
  private y: number | null = null;
  private alpha: number;

  /** @param alpha smoothing 0..1 — higher = smoother but more lag. */
  constructor(alpha = 0.4) {
    this.alpha = clamp(alpha, 0, 1);
  }

  reset(): void {
    this.y = null;
  }

  filter(x: number): number {
    if (this.y === null) {
      this.y = x;
      return x;
    }
    this.y = this.alpha * x + (1 - this.alpha) * this.y;
    return this.y;
  }
}

/**
 * Adaptive filter: lets fast movements through while smoothing slow jitter.
 * Useful for angle data where we want responsiveness during a rep but
 * stability while resting.
 */
export class AdaptiveAngleFilter {
  private prev: number | null = null;
  private prevTime: number | null = null;
  private value: number | null = null;
  private minAlpha: number;
  private maxAlpha: number;
  private speedForMaxAlpha: number;

  constructor(opts?: {
    minAlpha?: number;
    maxAlpha?: number;
    speedForMaxAlpha?: number;
  }) {
    this.minAlpha = opts?.minAlpha ?? 0.15;
    this.maxAlpha = opts?.maxAlpha ?? 0.9;
    this.speedForMaxAlpha = opts?.speedForMaxAlpha ?? 120; // deg/s
  }

  reset(): void {
    this.prev = null;
    this.prevTime = null;
    this.value = null;
  }

  filter(x: number, timestampMs: number): number {
    if (this.value === null || this.prev === null || this.prevTime === null) {
      this.value = x;
      this.prev = x;
      this.prevTime = timestampMs;
      return x;
    }
    const dt = Math.max((timestampMs - this.prevTime) / 1000, 1e-3);
    const speed = Math.abs(x - this.prev) / dt;
    const ratio = clamp(speed / this.speedForMaxAlpha, 0, 1);
    const alpha = this.minAlpha + (this.maxAlpha - this.minAlpha) * ratio;
    this.value = alpha * x + (1 - alpha) * this.value;
    this.prev = x;
    this.prevTime = timestampMs;
    return this.value;
  }
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi);
}
