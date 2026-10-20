using System.Collections.Generic;
using UnityEngine;

namespace KneeRehab.ExerciseSystem
{
    /// <summary>
    /// Accumulates range-of-motion (ROM) statistics across a whole session.
    /// Pure C#. ROM for a repetition = maxAngle - minAngle during that rep.
    ///
    /// Also records every per-rep ROM so we can compute a consistency score later.
    /// </summary>
    public class RomTracker
    {
        public readonly List<float> PerRepRom = new List<float>();

        // Session-wide extremes across ALL samples.
        public float SessionMaxAngle { get; private set; } = float.MinValue; // most flexed
        public float SessionMinAngle { get; private set; } = float.MaxValue; // most extended

        public float CurrentRom { get; private set; }
        public float BestRom { get; private set; }

        public void Reset()
        {
            PerRepRom.Clear();
            SessionMaxAngle = float.MinValue;
            SessionMinAngle = float.MaxValue;
            CurrentRom = 0f;
            BestRom = 0f;
        }

        /// <summary>Call every sample so session extremes stay up to date.</summary>
        public void Observe(float kneeAngle)
        {
            if (kneeAngle > SessionMaxAngle) SessionMaxAngle = kneeAngle;
            if (kneeAngle < SessionMinAngle) SessionMinAngle = kneeAngle;
        }

        /// <summary>Call when RepetitionDetector reports a completed rep.</summary>
        public void RecordRepetition(float repMinAngle, float repMaxAngle)
        {
            float rom = Mathf.Abs(repMaxAngle - repMinAngle);
            PerRepRom.Add(rom);
            CurrentRom = rom;
            if (rom > BestRom) BestRom = rom;
        }

        public float AverageRom
        {
            get
            {
                if (PerRepRom.Count == 0) return 0f;
                float sum = 0f;
                foreach (var r in PerRepRom) sum += r;
                return sum / PerRepRom.Count;
            }
        }

        /// <summary>Max flexion angle observed (largest angle).</summary>
        public float MaxFlexion => SessionMaxAngle == float.MinValue ? 0f : SessionMaxAngle;

        /// <summary>Max extension observed (smallest angle).</summary>
        public float MaxExtension => SessionMinAngle == float.MaxValue ? 0f : SessionMinAngle;
    }
}
