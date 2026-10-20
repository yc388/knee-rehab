using System;
using UnityEngine;

namespace KneeRehab.Sensors
{
    /// <summary>
    /// Produces REALISTIC simulated knee motion for the prototype.
    ///
    /// The motion is a smooth cyclic flex/extend wave (NOT random):
    ///   start (~90°) -> extended (~20°) -> back to start (~90°)  == one repetition.
    /// A small amount of band-limited noise (1-3°) is layered on top so the live
    /// graph looks like a real sensor rather than a perfect sine.
    ///
    /// This is a plain C# class, driven by SensorService.Tick(). It implements
    /// IKneeSensorProvider so the rest of the app cannot tell it apart from a real
    /// brace feed.
    /// </summary>
    public class SimulatedKneeSensorProvider : IKneeSensorProvider
    {
        // ---- Configuration (set by SensorService from the current exercise) ----
        public float StartAngle = 90f;   // seated / flexed position
        public float ExtendedAngle = 20f; // leg nearly straight
        public float SecondsPerRep = 4f;  // 3-5s per rep as specified
        public float NoiseDegrees = 2f;   // +/- realistic sensor jitter

        // ---- State ----
        private bool _connected;
        private float _time;             // seconds since Connect()
        private float _phase;            // 0..1 position within the current rep
        private float _prevAngle;
        private bool _hasPrev;
        private KneeSensorData _latest;

        // Perlin-noise seeds so each axis looks independent and smooth.
        private readonly float _seedAngle;
        private readonly float _seedGyro;

        public SimulatedKneeSensorProvider()
        {
            _seedAngle = UnityEngine.Random.value * 1000f;
            _seedGyro = UnityEngine.Random.value * 1000f;
        }

        public bool IsConnected => _connected;
        public KneeSensorData Latest => _latest;

        public event Action<KneeSensorData> NewData;
        public event Action<bool> ConnectionChanged;

        public void Connect()
        {
            if (_connected) return;
            _time = 0f;
            _phase = 0f;
            _hasPrev = false;
            _connected = true;
            ConnectionChanged?.Invoke(true);
        }

        public void Disconnect()
        {
            if (!_connected) return;
            _connected = false;
            ConnectionChanged?.Invoke(false);
        }

        /// <summary>
        /// Reset the waveform to the start of a repetition without disconnecting.
        /// Called when a new exercise session begins so the first rep is clean.
        /// </summary>
        public void ResetWaveform()
        {
            _time = 0f;
            _phase = 0f;
            _hasPrev = false;
        }

        public void Tick(float deltaTime)
        {
            if (!_connected) return;

            _time += deltaTime;

            // Advance phase through the rep cycle. One full cycle == one repetition.
            _phase += deltaTime / Mathf.Max(0.5f, SecondsPerRep);
            if (_phase >= 1f) _phase -= 1f;

            // ---- Build the smooth flex/extend curve ----
            // A raised-cosine gives a gentle ease-in/ease-out at both extremes,
            // which matches how a person actually extends and returns the leg.
            // tri goes 0 -> 1 -> 0 across the rep (start -> extended -> start).
            float tri = 0.5f * (1f - Mathf.Cos(_phase * 2f * Mathf.PI));
            float baseAngle = Mathf.Lerp(StartAngle, ExtendedAngle, tri);

            // Band-limited noise (Perlin) keeps it smooth instead of spiky random.
            float noise = (Mathf.PerlinNoise(_seedAngle, _time * 1.5f) - 0.5f) * 2f * NoiseDegrees;
            float angle = baseAngle + noise;

            // ---- Angular velocity from frame-to-frame change ----
            float angularVelocity = 0f;
            if (_hasPrev && deltaTime > 0f)
                angularVelocity = (angle - _prevAngle) / deltaTime;
            _prevAngle = angle;
            _hasPrev = true;

            // ---- Plausible placeholder IMU axes (derived, not meaningful clinically) ----
            // Lower leg swings in a vertical plane: gyro Z tracks the knee rate,
            // accel reflects gravity projected through the current angle.
            float rad = angle * Mathf.Deg2Rad;
            float gyroZ = angularVelocity; // deg/s about the knee axis
            float gyroNoise = (Mathf.PerlinNoise(_seedGyro, _time * 2f) - 0.5f) * 1.5f;

            _latest = new KneeSensorData(
                timestamp: _time,
                kneeAngle: angle,
                angularVelocity: angularVelocity,
                accelerationX: Mathf.Sin(rad) * 9.81f,
                accelerationY: Mathf.Cos(rad) * 9.81f,
                accelerationZ: 0.2f * gyroNoise,
                gyroX: gyroNoise,
                gyroY: gyroNoise * 0.5f,
                gyroZ: gyroZ);

            NewData?.Invoke(_latest);
        }
    }
}
