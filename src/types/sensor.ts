/**
 * Sensor data contracts.
 *
 * These types describe the shape of a single IMU reading coming from the knee
 * brace. They are intentionally transport-agnostic: whether the reading is
 * produced by the simulator, a BLE controller, or a Wi-Fi/WebSocket bridge,
 * it is normalised into this structure before it reaches the application.
 */

/**
 * A single reading from the knee-brace IMU.
 *
 * Angles are in degrees, angular velocity in degrees/second, acceleration in
 * g (gravitational units) and gyroscope values in degrees/second.
 */
export interface SensorReading {
  /** Epoch milliseconds when the reading was produced. */
  timestamp: number;
  /** Knee flexion angle in degrees. 0° = fully extended (straight leg). */
  kneeAngle: number;
  /** Rate of change of the knee angle, degrees/second. Signed. */
  angularVelocity: number;
  /** Linear acceleration along the X axis, in g. */
  accelerationX: number;
  /** Linear acceleration along the Y axis, in g. */
  accelerationY: number;
  /** Linear acceleration along the Z axis, in g. */
  accelerationZ: number;
  /** Angular rate around the X axis, degrees/second. */
  gyroX: number;
  /** Angular rate around the Y axis, degrees/second. */
  gyroY: number;
  /** Angular rate around the Z axis, degrees/second. */
  gyroZ: number;
}

/** Connection state of the (simulated or real) knee brace. */
export type BraceConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

/**
 * How the application is currently sourcing sensor data.
 *
 * - `simulation` — realistic generated motion, for demos without hardware.
 * - `ble`        — Web Bluetooth connection to a sensor controller.
 * - `websocket`  — Wi-Fi/WebSocket bridge to a microcontroller/edge device.
 *
 * In `ble` / `websocket` (Real Sensor Mode) the app NEVER fabricates readings:
 * if hardware is not connected it shows a clear disconnected state.
 */
export type SensorMode = 'simulation' | 'ble' | 'websocket';

/** Signal quality of the sensor link, where the transport can report it. */
export interface LinkQuality {
  /** 0–100 subjective quality score (derived from RSSI / sample rate / drops). */
  score: number;
  /** Received signal strength, dBm (BLE). Null if not available. */
  rssi: number | null;
  /** Effective sample rate observed at the app, Hz. */
  sampleRateHz: number;
  /** Count of dropped / malformed packets since connect. */
  droppedPackets: number;
}

/**
 * Configuration for a sensor source: data format and connection settings.
 * Fields are optional because they are transport-specific.
 */
export interface SensorConnectionConfig {
  /** WebSocket URL, e.g. ws://192.168.1.50:81 (websocket mode). */
  websocketUrl?: string;
  /** BLE GATT service UUID to look for (ble mode). */
  bleServiceUuid?: string;
  /** BLE characteristic UUID that notifies sensor frames (ble mode). */
  bleCharacteristicUuid?: string;
  /**
   * Angle convention: the raw sensor value that corresponds to a fully
   * extended (straight) knee, used to zero/offset incoming readings.
   */
  angleOffsetDeg?: number;
  /** Multiply raw angle by this to match the app's 0°=straight convention. */
  angleScale?: number;
  /** Expected incoming sample rate, Hz (used for quality estimation). */
  expectedSampleRateHz?: number;
  /** Low-pass filter smoothing factor 0–1 (0 = none, higher = smoother). */
  filterAlpha?: number;
}

/** Callback invoked for every new sensor reading. */
export type SensorListener = (reading: SensorReading) => void;

/** Callback invoked whenever the connection state changes. */
export type ConnectionListener = (state: BraceConnectionState) => void;

/** Callback invoked when link quality is updated. */
export type QualityListener = (quality: LinkQuality) => void;
