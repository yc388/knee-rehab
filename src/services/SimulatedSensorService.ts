import type { SensorReading } from '@/types/sensor';
import {
  BaseSensorService,
  type StreamConfig,
} from '@/services/SensorService';

/**
 * SimulatedSensorService — produces realistic, smoothly-varying IMU readings.
 *
 * Instead of random noise, the knee angle follows a smooth oscillation between
 * the exercise's start and target angles (a raised-cosine profile, so the
 * movement eases in and out like a real controlled rehab movement). A small
 * amount of band-limited noise and a brief "hold" at the peak make the trace
 * look convincingly human. Angular velocity is derived from the angle change,
 * and the accelerometer / gyroscope channels are synthesised from the motion
 * so the full IMU payload is populated.
 *
 * This is a drop-in implementation of `SensorService`. To use a real brace,
 * implement `SensorService` (e.g. reading a WebSocket) and swap it in the
 * SensorProvider — no UI changes required.
 */
export class SimulatedSensorService extends BaseSensorService {
  private timer: ReturnType<typeof setInterval> | null = null;
  private config: Required<StreamConfig> = {
    startAngle: 90,
    targetAngle: 20,
    repPeriodMs: 4000,
    sampleRateHz: 30,
  };

  private startTime = 0;
  private lastAngle = 0;
  private lastTimestamp = 0;
  /** Per-session random phase so each session looks slightly different. */
  private noiseSeed = Math.random() * 1000;

  async connect(): Promise<void> {
    this.setState('connecting');
    // Simulate a short handshake with the brace / edge device.
    await delay(1200);
    this.setState('connected');
  }

  disconnect(): void {
    this.stopStreaming();
    this.setState('disconnected');
  }

  startStreaming(config?: StreamConfig): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.stopStreaming();
    this.startTime = performance.now();
    this.lastTimestamp = Date.now();
    this.lastAngle = this.config.startAngle;

    const intervalMs = 1000 / this.config.sampleRateHz;
    this.timer = setInterval(() => this.tick(), intervalMs);
  }

  stopStreaming(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Produce and emit a single reading based on the elapsed time. */
  private tick(): void {
    const now = Date.now();
    const elapsed = performance.now() - this.startTime;
    const { startAngle, targetAngle, repPeriodMs } = this.config;

    // Phase within the current repetition, 0..1.
    const phase = (elapsed % repPeriodMs) / repPeriodMs;

    // Raised-cosine motion: rests near start, eases to target at mid-cycle,
    // eases back. 0 at phase 0/1, 1 at phase 0.5.
    const eased = 0.5 - 0.5 * Math.cos(phase * 2 * Math.PI);

    // Add a short "hold" plateau near the peak for realism.
    const held = applyHold(eased);

    const span = targetAngle - startAngle;
    let kneeAngle = startAngle + span * held;

    // Band-limited physiological noise (a couple of slow sine components).
    const t = elapsed / 1000;
    const noise =
      0.8 * Math.sin(t * 3.1 + this.noiseSeed) +
      0.4 * Math.sin(t * 7.7 + this.noiseSeed * 1.7);
    kneeAngle += noise;

    // Angular velocity from finite difference, degrees/second.
    const dtSec = Math.max((now - this.lastTimestamp) / 1000, 1e-3);
    const angularVelocity = (kneeAngle - this.lastAngle) / dtSec;

    // Synthesise IMU channels from the motion. These are plausible values, not
    // a biomechanical model — enough to populate the full payload realistically.
    const avRad = (angularVelocity * Math.PI) / 180;
    const reading: SensorReading = {
      timestamp: now,
      kneeAngle: round1(kneeAngle),
      angularVelocity: round1(angularVelocity),
      // Gravity split across axes shifts as the shank rotates.
      accelerationX: round2(Math.sin((kneeAngle * Math.PI) / 180) + jitter(0.02)),
      accelerationY: round2(Math.cos((kneeAngle * Math.PI) / 180) + jitter(0.02)),
      accelerationZ: round2(0.15 * avRad + jitter(0.02)),
      // Gyro X carries most of the sagittal-plane rotation.
      gyroX: round1(angularVelocity + jitter(1.5)),
      gyroY: round1(jitter(2)),
      gyroZ: round1(jitter(2)),
    };

    this.lastAngle = kneeAngle;
    this.lastTimestamp = now;
    this.emitReading(reading);
  }
}

/**
 * Shape the eased value so the movement lingers briefly near the peak,
 * mimicking the "hold" cue in the exercise instructions.
 */
function applyHold(eased: number): number {
  const holdThreshold = 0.82;
  if (eased > holdThreshold) {
    // Compress the top of the range so values spend longer near 1.
    const over = (eased - holdThreshold) / (1 - holdThreshold);
    return holdThreshold + (1 - holdThreshold) * smoothstep(over);
  }
  return eased;
}

function smoothstep(x: number): number {
  const c = Math.min(Math.max(x, 0), 1);
  return c * c * (3 - 2 * c);
}

function jitter(amp: number): number {
  return (Math.random() - 0.5) * 2 * amp;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
