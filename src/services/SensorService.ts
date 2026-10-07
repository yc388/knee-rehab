import type {
  BraceConnectionState,
  ConnectionListener,
  SensorListener,
} from '@/types/sensor';

/**
 * SensorService — the abstraction the entire UI depends on.
 *
 * The application never talks to a concrete data source directly. It talks to
 * this interface. Today the only implementation is `SimulatedSensorService`;
 * tomorrow a `RealKneeBraceSensorService` (reading from an IMU over a
 * 5G/edge/WebSocket link) can be dropped in with zero UI changes.
 *
 *   Knee Brace IMU -> Edge Device -> 5G Network -> SensorService -> UI
 *
 * Implementations are responsible for:
 *   - managing the connection lifecycle,
 *   - emitting normalised `SensorReading`s to subscribers,
 *   - reporting connection-state changes.
 */
export interface SensorService {
  /** Current connection state. */
  readonly state: BraceConnectionState;

  /**
   * Begin connecting to the brace. Resolves once connected (or rejects on
   * failure). Connection-state changes are also emitted to listeners.
   */
  connect(): Promise<void>;

  /** Disconnect from the brace and stop emitting readings. */
  disconnect(): void;

  /**
   * Start streaming readings. For a given exercise the implementation may use
   * the provided configuration to shape the motion it produces.
   */
  startStreaming(config?: StreamConfig): void;

  /** Stop streaming readings (connection stays open). */
  stopStreaming(): void;

  /** Subscribe to sensor readings. Returns an unsubscribe function. */
  onReading(listener: SensorListener): () => void;

  /** Subscribe to connection-state changes. Returns an unsubscribe function. */
  onConnectionChange(listener: ConnectionListener): () => void;
}

/**
 * Hints the UI passes to the sensor source when a session starts. A real
 * service may ignore these; the simulator uses them to generate realistic,
 * exercise-appropriate motion.
 */
export interface StreamConfig {
  /** Resting knee angle, degrees. */
  startAngle: number;
  /** Peak knee angle at the top of the movement, degrees. */
  targetAngle: number;
  /** Nominal time for one full repetition, milliseconds. */
  repPeriodMs?: number;
  /** Reading emission rate, Hz. Defaults to 30 Hz. */
  sampleRateHz?: number;
}

/**
 * A small base class that handles subscriber bookkeeping and state
 * transitions, so concrete services only implement data production.
 */
export abstract class BaseSensorService implements SensorService {
  protected _state: BraceConnectionState = 'disconnected';
  private readingListeners = new Set<SensorListener>();
  private connectionListeners = new Set<ConnectionListener>();

  get state(): BraceConnectionState {
    return this._state;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): void;
  abstract startStreaming(config?: StreamConfig): void;
  abstract stopStreaming(): void;

  onReading(listener: SensorListener): () => void {
    this.readingListeners.add(listener);
    return () => this.readingListeners.delete(listener);
  }

  onConnectionChange(listener: ConnectionListener): () => void {
    this.connectionListeners.add(listener);
    // Emit current state immediately so new subscribers are in sync.
    listener(this._state);
    return () => this.connectionListeners.delete(listener);
  }

  /** Emit a reading to all subscribers. */
  protected emitReading(reading: Parameters<SensorListener>[0]): void {
    this.readingListeners.forEach((l) => l(reading));
  }

  /** Update and broadcast the connection state. */
  protected setState(state: BraceConnectionState): void {
    this._state = state;
    this.connectionListeners.forEach((l) => l(state));
  }
}
