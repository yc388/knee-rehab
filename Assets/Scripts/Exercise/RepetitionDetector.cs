using System;

namespace KneeRehab.ExerciseSystem
{
    /// <summary>
    /// The movement state machine for one repetition. Pure C# (no Unity deps) so it
    /// is easy to reason about and unit-test.
    ///
    /// For Seated Knee Extension the angle goes:
    ///   start (~90) -> extended (~20) -> back to start (~90)  == 1 rep.
    ///
    /// States:
    ///   WAITING    : at/near start, haven't begun extending yet
    ///   EXTENDING  : angle is decreasing toward the extended threshold
    ///   EXTENDED   : crossed extendedEnterThreshold (leg nearly straight)
    ///   RETURNING  : angle increasing back toward start
    ///   (on crossing returnedThreshold while RETURNING) -> count +1, back to WAITING
    ///
    /// Hysteresis: the "enter extended" and "returned" thresholds are deliberately
    /// far apart (e.g. 35 vs 75), so small sensor fluctuations around one threshold
    /// cannot repeatedly toggle the state and over-count. A repetition is only
    /// counted after a FULL extend-and-return cycle.
    /// </summary>
    public class RepetitionDetector
    {
        public enum MovementState { Waiting, Extending, Extended, Returning }

        public MovementState State { get; private set; } = MovementState.Waiting;
        public int RepCount { get; private set; }

        // Per-rep angle extremes, used by RomTracker/score.
        public float CurrentRepMinAngle { get; private set; } = float.MaxValue;
        public float CurrentRepMaxAngle { get; private set; } = float.MinValue;

        /// <summary>Raised when a full repetition completes. Args: (repNumber, repMinAngle, repMaxAngle).</summary>
        public event Action<int, float, float> RepetitionCompleted;

        private readonly float _extendedEnter;  // e.g. 35°: below this => "extended"
        private readonly float _returned;        // e.g. 75°: above this => "returned"
        private readonly float _startBand;       // how close to max counts as "at start"

        public RepetitionDetector(float extendedEnterThreshold, float returnedThreshold, float startBand = 8f)
        {
            _extendedEnter = extendedEnterThreshold;
            _returned = returnedThreshold;
            _startBand = startBand;
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

        /// <summary>
        /// Feed one angle sample. Returns true on the exact frame a rep completes.
        /// </summary>
        public bool Process(float kneeAngle)
        {
            // Track extremes for the current (in-progress) repetition.
            if (kneeAngle < CurrentRepMinAngle) CurrentRepMinAngle = kneeAngle;
            if (kneeAngle > CurrentRepMaxAngle) CurrentRepMaxAngle = kneeAngle;

            bool completedThisFrame = false;

            switch (State)
            {
                case MovementState.Waiting:
                    // Begin extending once the user starts straightening (angle drops
                    // a little below the returned band). This avoids triggering on
                    // tiny jitter at the start position.
                    if (kneeAngle < _returned - _startBand)
                        State = MovementState.Extending;
                    break;

                case MovementState.Extending:
                    if (kneeAngle <= _extendedEnter)
                        State = MovementState.Extended; // reached near-straight
                    break;

                case MovementState.Extended:
                    // Once they start bending back past the extended threshold, they
                    // are returning.
                    if (kneeAngle > _extendedEnter)
                        State = MovementState.Returning;
                    break;

                case MovementState.Returning:
                    if (kneeAngle >= _returned)
                    {
                        // Full cycle done -> count the rep.
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
            MovementState.Extending => "Extending",
            MovementState.Extended => "Hold",
            MovementState.Returning => "Returning",
            _ => State.ToString()
        };
    }
}
