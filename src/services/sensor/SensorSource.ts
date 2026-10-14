import type {
  BraceConnectionState,
  ConnectionListener,
  LinkQuality,
  QualityListener,
  SensorConnectionConfig,
  SensorListener,
  SensorMode,
  SensorReading,
} from '@/types/sensor';

/**
 * SensorSource — the modular adapter interface the whole app depends on.
 *
 *   Knee Brace Sensors → Microcontroller → BLE / Wi-Fi → SensorSource → App
 *
 * Concrete adapters (SimulatedSensorSource, BleSensorSource,
 * WebSocketSensorSource) implement this. The UI only ever talks to a
 * SensorSource, so a new transport can be added without touching components.
 *
 * Contract notes:
 *  - In REAL modes (ble/websocket) an adapter MUST NOT fabricate readings.
 *    If hardware is not connected it stays `disconnected`/`error` and emits
 *    nothing.
 *  - Adapters are responsible for applying the angle convention
 *    (offset/scale) and optional low-pass filtering from the config.
 */
export interface SensorSource {
  readonly mode: SensorMode;
  readonly state: BraceConnectionState;
  readonly quality: LinkQuality | null;

  /** Begin connecting. Resolves on success; rejects on failure. */
  connect(config?: SensorConnectionConfig): Promise<void>;
  /** Disconnect and stop all emission. */
  disconnect(): void;
  /** Attempt to re-establish a dropped connection without a page reload. */
  reconnect(): Promise<void>;

  /** Begin streaming readings. */
  startStreaming(hint?: StreamHint): void;
  /** Stop streaming (connection may stay open). */
  stopStreaming(): void;

  onReading(listener: SensorListener): () => void;
  onConnectionChange(listener: ConnectionListener): () => void;
  onQualityChange(listener: QualityListener): () => void;
}

/**
 * Optional hints a source may use when streaming starts. Real adapters ignore
 * the motion-shaping fields; the simulator uses them to generate realistic,
 * exercise-appropriate movement.
 */
export interface StreamHint {
  startAngle: number;
  targetAngle: number;
  /** Nominal time for one full repetition, milliseconds. */
  repPeriodMs?: number;
  /** Direction of the effort peak relative to start. */
  direction?: 'flexion' | 'extension';
}

/** Shared subscriber bookkeeping + quality estimation for all adapters. */
export abstract class BaseSensorSource implements SensorSource {
  abstract readonly mode: SensorMode;

  protected _state: BraceConnectionState = 'disconnected';
  protected _quality: LinkQuality | null = null;
  protected config: SensorConnectionConfig = {};

  private readingListeners = new Set<SensorListener>();
  private connectionListeners = new Set<ConnectionListener>();
  private qualityListeners = new Set<QualityListener>();

  // Rolling sample-rate estimation.
  private recentTimestamps: number[] = [];

  get state(): BraceConnectionState {
    return this._state;
  }
  get quality(): LinkQuality | null {
    return this._quality;
  }

  abstract connect(config?: SensorConnectionConfig): Promise<void>;
  abstract disconnect(): void;
  abstract startStreaming(hint?: StreamHint): void;
  abstract stopStreaming(): void;

  async reconnect(): Promise<void> {
    this.setState('reconnecting');
    try {
      await this.connect(this.config);
    } catch (err) {
      this.setState('error');
      throw err;
    }
  }

  onReading(listener: SensorListener): () => void {
    this.readingListeners.add(listener);
    return () => this.readingListeners.delete(listener);
  }
  onConnectionChange(listener: ConnectionListener): () => void {
    this.connectionListeners.add(listener);
    listener(this._state);
    return () => this.connectionListeners.delete(listener);
  }
  onQualityChange(listener: QualityListener): () => void {
    this.qualityListeners.add(listener);
    if (this._quality) listener(this._quality);
    return () => this.qualityListeners.delete(listener);
  }

  protected emitReading(reading: SensorReading): void {
    this.trackSampleRate(reading.timestamp);
    this.readingListeners.forEach((l) => l(reading));
  }

  protected setState(state: BraceConnectionState): void {
    this._state = state;
    this.connectionListeners.forEach((l) => l(state));
  }

  protected setQuality(q: LinkQuality): void {
    this._quality = q;
    this.qualityListeners.forEach((l) => l(q));
  }

  protected markDropped(count = 1): void {
    if (!this._quality) return;
    this.setQuality({
      ...this._quality,
      droppedPackets: this._quality.droppedPackets + count,
    });
  }

  /** Apply configured angle offset/scale to a raw angle value. */
  protected applyAngleConvention(rawAngle: number): number {
    const scale = this.config.angleScale ?? 1;
    const offset = this.config.angleOffsetDeg ?? 0;
    return rawAngle * scale - offset;
  }

  private trackSampleRate(ts: number): void {
    this.recentTimestamps.push(ts);
    if (this.recentTimestamps.length > 30) this.recentTimestamps.shift();
    if (this.recentTimestamps.length >= 2) {
      const span =
        this.recentTimestamps[this.recentTimestamps.length - 1] -
        this.recentTimestamps[0];
      const hz =
        span > 0 ? ((this.recentTimestamps.length - 1) / span) * 1000 : 0;
      const expected = this.config.expectedSampleRateHz ?? 30;
      const rateScore = clamp((hz / expected) * 100, 0, 100);
      const prev = this._quality;
      this.setQuality({
        score: Math.round(rateScore),
        rssi: prev?.rssi ?? null,
        sampleRateHz: Math.round(hz),
        droppedPackets: prev?.droppedPackets ?? 0,
      });
    }
  }
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi);
}
