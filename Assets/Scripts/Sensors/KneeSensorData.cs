using System;

namespace KneeRehab.Sensors
{
    /// <summary>
    /// Immutable snapshot of a single IMU / knee-sensor reading.
    ///
    /// This is a plain C# struct (not a MonoBehaviour) so it is cheap to copy
    /// and can be produced by ANY source: the simulator, a UDP packet from the
    /// Raspberry Pi, a WebSocket frame over 5G, or a unit test.
    ///
    /// Angle convention used throughout the app:
    ///   - kneeAngle is the FLEXION angle in degrees.
    ///   - ~90 deg  = knee bent (seated start position).
    ///   - ~0-20 deg = knee almost straight (fully extended).
    /// </summary>
    [Serializable]
    public struct KneeSensorData
    {
        /// <summary>Seconds since the session/provider started. Monotonic.</summary>
        public float timestamp;

        /// <summary>Knee flexion angle in degrees (0 = straight, 90 = bent).</summary>
        public float kneeAngle;

        /// <summary>Signed angular velocity of the knee joint, degrees/second.</summary>
        public float angularVelocity;

        // Raw accelerometer axes (m/s^2). Populated by real IMU; the simulator
        // fills plausible placeholder values so downstream code can be developed.
        public float accelerationX;
        public float accelerationY;
        public float accelerationZ;

        // Raw gyroscope axes (deg/s).
        public float gyroX;
        public float gyroY;
        public float gyroZ;

        public KneeSensorData(
            float timestamp,
            float kneeAngle,
            float angularVelocity,
            float accelerationX = 0f,
            float accelerationY = 0f,
            float accelerationZ = 0f,
            float gyroX = 0f,
            float gyroY = 0f,
            float gyroZ = 0f)
        {
            this.timestamp = timestamp;
            this.kneeAngle = kneeAngle;
            this.angularVelocity = angularVelocity;
            this.accelerationX = accelerationX;
            this.accelerationY = accelerationY;
            this.accelerationZ = accelerationZ;
            this.gyroX = gyroX;
            this.gyroY = gyroY;
            this.gyroZ = gyroZ;
        }

        public override string ToString()
        {
            return $"[t={timestamp:F2}s angle={kneeAngle:F1}° vel={angularVelocity:F1}°/s]";
        }
    }
}
