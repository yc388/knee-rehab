import type { SensorMode, SensorReading } from '@/types/sensor';
import { BaseSensorSource, type StreamHint } from './SensorSource';

/**
 * SimulatedSensorSource — realistic generated motion for demos without
 * hardware. Smooth raised-cosine flexion/extension with a brief hold at the
 * peak and band-limited physiological noise (never pure random numbers).
 *
 * This is clearly a SIMULATION source; the app surfaces that provenance so
 * demo data is never mistaken for real sensor measurements.
 */
export class SimulatedSensorSource extends BaseSensorSource {
  readonly mode: SensorMode = 'simulation';

  private timer: ReturnType<typeof setInterval> | null = null;
  private startAngle = 90;
  private targetAngle = 20;
  private repPeriodMs = 4000;
  private sampleRateHz = 30;

  private startPerf = 0;
  private lastAngle = 0;
  private lastTs = 0;
  private noiseSeed = Math.random() * 1000;

  async connect(): Promise<void> {
    this.setState('connecting');
    await delay(900);
    this.setState('connected');
    this.setQuality({
      score: 100,
      rssi: -45,
      sampleRateHz: this.sampleRateHz,
      droppedPackets: 0,
    });
  }

  disconnect(): void {
    this.stopStreaming();
    this.setState('disconnected');
  }

  startStreaming(hint?: StreamHint): void {
    if (hint) {
      this.startAngle = hint.startAngle;
      this.targetAngle = hint.targetAngle;
      if (hint.repPeriodMs) this.repPeriodMs = hint.repPeriodMs;
    }
    this.stopStreaming();
    this.startPerf = performance.now();
    this.lastTs = Date.now();
    this.lastAngle = this.startAngle;
    this.noiseSeed = Math.random() * 1000;
    const intervalMs = 1000 / this.sampleRateHz;
    this.timer = setInterval(() => this.tick(), intervalMs);
  }

  stopStreaming(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private tick(): void {
    const now = Date.now();
    const elapsed = performance.now() - this.startPerf;

    const phase = (elapsed % this.repPeriodMs) / this.repPeriodMs;
    const eased = 0.5 - 0.5 * Math.cos(phase * 2 * Math.PI);
    const held = applyHold(eased);
    const span = this.targetAngle - this.startAngle;

    const t = elapsed / 1000;
    const noise =
      0.8 * Math.sin(t * 3.1 + this.noiseSeed) +
      0.4 * Math.sin(t * 7.7 + this.noiseSeed * 1.7);
    const kneeAngle = this.startAngle + span * held + noise;

    const dtSec = Math.max((now - this.lastTs) / 1000, 1e-3);
    const angularVelocity = (kneeAngle - this.lastAngle) / dtSec;
    const avRad = (angularVelocity * Math.PI) / 180;

    const reading: SensorReading = {
      timestamp: now,
      kneeAngle: round1(kneeAngle),
      angularVelocity: round1(angularVelocity),
      accelerationX: round2(Math.sin((kneeAngle * Math.PI) / 180) + jitter(0.02)),
      accelerationY: round2(Math.cos((kneeAngle * Math.PI) / 180) + jitter(0.02)),
      accelerationZ: round2(0.15 * avRad + jitter(0.02)),
      gyroX: round1(angularVelocity + jitter(1.5)),
      gyroY: round1(jitter(2)),
      gyroZ: round1(jitter(2)),
    };

    this.lastAngle = kneeAngle;
    this.lastTs = now;
    this.emitReading(reading);
  }
}

function applyHold(eased: number): number {
  const h = 0.82;
  if (eased > h) {
    const over = (eased - h) / (1 - h);
    return h + (1 - h) * smoothstep(over);
  }
  return eased;
}
function smoothstep(x: number): number {
  const c = Math.min(Math.max(x, 0), 1);
  return c * c * (3 - 2 * c);
}
function jitter(a: number): number {
  return (Math.random() - 0.5) * 2 * a;
}
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
