using System;
using UnityEngine;

namespace KneeRehab.ExerciseSystem
{
    /// <summary>
    /// Direction-agnostic repetition state machine. Works for BOTH extension
    /// exercises (angle decreases toward the target, e.g. 90°→15°) and flexion
    /// exercises (angle increases toward the target, e.g. 15°→90°).
    ///
    /// It converts the raw angle into "progress toward the target" in 0..1:
    ///   progress = 0  at the start (resting) position
    ///   progress = 1  at the target (goal) position
    /// A repetition is: start → reach the target region → return to start.
    ///
    /// Hysteresis: separate high/low progress thresholds prevent small sensor
    /// fluctuations near one threshold from repeatedly toggling state / over-counting.
    ///
    /// States:
    ///   WAITING   : near the start, not yet moving toward the target
    ///   MOVING    : progressing toward the target
    ///   REACHED   : crossed the "reached" threshold (near/at the target)
    ///   RETURNING : coming back toward the start
    ///   -> on crossing back near the start while RETURNING: rep++ , back to WAITING
    /// </summary>
    public class RepetitionDetector
    {
        public enum MovementState { Waiting, Moving, Reached, Returning }

        public MovementState State { get; private set; } = MovementState.Waiting;
        public int RepCount { get; private set; }

        public float CurrentRepMinAngle { get; private set; } = float.MaxValue;
        public float CurrentRepMaxAngle { get; private set; } = float.MinValue;

        /// <summary>Raised when a full repetition completes. Args: (repNumber, repMinAngle, repMaxAngle).</summary>
        public event Action<int, float, float> RepetitionCompleted;

        private float _startAngle;
        private float _targetAngle;

        // Progress thresholds (0..1) with hysteresis.
        private const float ReachedProgress = 0.70f; // counts as "reached the target"
        private const float ReturnedProgress = 0.25f; // counts as "returned to start"
        private const float BeginMovingProgress = 0.15f; // leaves Waiting

        public RepetitionDetector(float startAngle, float targetAngle)
        {
            _startAngle = startAngle;
            _targetAngle = targetAngle;
        }

        public void UpdateThresholds(float startAngle, float targetAngle)
        {
            _startAngle = startAngle;
            _targetAngle = targetAngle;
        }

        public void Reset()
        {
            State = MovementState.Waiting;
            RepCount = 0;
            ResetRepExtremes();
        }

        private void ResetRepExtremes()
        {
            CurrentRepMinAngle = float.MaxValue;
            CurrentRepMaxAngle = float.MinValue;
        }

        /// <summary>0 at the start position, 1 at the target position (either direction).</summary>
        private float Progress(float angle)
        {
            float span = _targetAngle - _startAngle;
            if (Mathf.Abs(span) < 0.001f) return 0f;
            return Mathf.Clamp01((angle - _startAngle) / span);
        }

        /// <summary>Feed one angle sample. Returns true on the frame a rep completes.</summary>
        public bool Process(float kneeAngle)
        {
            if (kneeAngle < CurrentRepMinAngle) CurrentRepMinAngle = kneeAngle;
            if (kneeAngle > CurrentRepMaxAngle) CurrentRepMaxAngle = kneeAngle;

            float p = Progress(kneeAngle);
            bool completedThisFrame = false;

            switch (State)
            {
                case MovementState.Waiting:
                    if (p > BeginMovingProgress) State = MovementState.Moving;
                    break;

                case MovementState.Moving:
                    if (p >= ReachedProgress) State = MovementState.Reached;
                    break;

                case MovementState.Reached:
                    if (p < ReachedProgress) State = MovementState.Returning;
                    break;

                case MovementState.Returning:
                    if (p <= ReturnedProgress)
                    {
                        RepCount++;
                        completedThisFrame = true;
                        RepetitionCompleted?.Invoke(RepCount, CurrentRepMinAngle, CurrentRepMaxAngle);
                        ResetRepExtremes();
                        State = MovementState.Waiting;
                    }
                    break;
            }

            return completedThisFrame;
        }

        public string StateLabel => State switch
        {
            MovementState.Waiting => "Ready",
            MovementState.Moving => "Moving",
            MovementState.Reached => "Hold",
            MovementState.Returning => "Returning",
            _ => State.ToString()
        };
    }
}
