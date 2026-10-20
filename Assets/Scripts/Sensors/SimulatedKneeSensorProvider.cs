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
        public float StartAngle = 90f;   // seated / flexed (resting) position
        public float ExtendedAngle = 20f; // the user's chosen TARGET (goal to reach)
        public float SecondsPerRep = 4f;  // 3-5s per rep as specified
        public float NoiseDegrees = 2f;   // +/- realistic sensor jitter

        [Tooltip("Max degrees a rep may fall short of (or overshoot) the target, so " +
                 "not every rep is identical. Set 0 for perfect reps.")]
        public float PerRepVariation = 14f;

        // ---- State ----
        private bool _connected;
        private float _time;             // seconds since Connect()
        private float _phase;            // 0..1 position within the current rep
        private float _prevAngle;
        private bool _hasPrev;
        private KneeSensorData _latest;

        // The actual extension depth for the CURRENT rep (varies each rep for realism).
        private float _currentRepExtended;
        private float _currentRepSpeedScale = 1f;

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
            RollNextRep();
            _connected = true;
            ConnectionChanged?.Invoke(true);
        }

        /// <summary>
        /// Choose a slightly different extension depth and speed for the next rep so
        /// the simulated motion looks human: some reps reach the target, some fall a
        /// little short, each at a marginally different pace.
        /// </summary>
        private void RollNextRep()
        {
            // Works for both extension (target < start) and flexion (target > start).
            // "Short" means not reaching as far toward the target; bias slightly
            // toward falling short (realistic fatigue), with occasional full reps.
            bool extension = ExtendedAngle <= StartAngle;
            float shortfall = UnityEngine.Random.Range(-PerRepVariation * 0.4f, PerRepVariation);

            // For extension, falling short = a LARGER angle; for flexion = a SMALLER angle.
            _currentRepExtended = extension
                ? ExtendedAngle + shortfall
                : ExtendedAngle - shortfall;

            // Clamp to a sensible range between 0 and the start, keeping a small gap.
            float lo = Mathf.Min(StartAngle, ExtendedAngle) - 3f;
            float hi = Mathf.Max(StartAngle, ExtendedAngle) + 3f;
            _currentRepExtended = Mathf.Clamp(_currentRepExtended, Mathf.Max(0f, lo), hi);

            _currentRepSpeedScale = UnityEngine.Random.Range(0.85f, 1.2f);
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
            RollNextRep();
        }

        public void Tick(float deltaTime)
        {
            if (!_connected) return;

            _time += deltaTime;

            // Advance phase through the rep cycle. One full cycle == one repetition.
            _phase += (deltaTime / Mathf.Max(0.5f, SecondsPerRep)) * _currentRepSpeedScale;
            if (_phase >= 1f)
            {
                _phase -= 1f;
                RollNextRep(); // new depth/speed for the rep that just started
            }

            // ---- Build the smooth flex/extend curve ----
            // A raised-cosine gives a gentle ease-in/ease-out at both extremes,
            // which matches how a person actually extends and returns the leg.
            // tri goes 0 -> 1 -> 0 across the rep (start -> extended -> start).
            float tri = 0.5f * (1f - Mathf.Cos(_phase * 2f * Mathf.PI));
            float baseAngle = Mathf.Lerp(StartAngle, _currentRepExtended, tri);

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
