/**
 * Sensor data contracts.
 *
 * These types describe the shape of a single IMU reading coming from the knee
 * brace. They are intentionally transport-agnostic: whether the reading is
 * produced by the simulator or by a real brace over a 5G/edge link, it is
 * normalised into this structure before it reaches the application.
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
  | 'error';

/** Callback invoked for every new sensor reading. */
export type SensorListener = (reading: SensorReading) => void;

/** Callback invoked whenever the connection state changes. */
export type ConnectionListener = (state: BraceConnectionState) => void;
