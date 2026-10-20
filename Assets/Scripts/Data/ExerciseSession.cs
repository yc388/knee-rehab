using System;
using System.Collections.Generic;

namespace KneeRehab.Data
{
    /// <summary>
    /// A completed exercise session, saved to local history. [Serializable] so Unity's
    /// JsonUtility can round-trip it. Plain fields (no properties) because JsonUtility
    /// only serializes public fields.
    /// </summary>
    [Serializable]
    public class ExerciseSession
    {
        public string sessionId;        // GUID string
        public string dateIso;          // ISO-8601 so it sorts and parses cleanly
        public string exerciseName;

        public int repetitionsCompleted;
        public int repetitionsTarget;

        public float durationSeconds;

        public float maxFlexion;        // largest angle (deg)
        public float maxExtension;      // smallest angle (deg)
        public float maxRom;            // best single-rep ROM (deg)
        public float averageRom;        // mean per-rep ROM (deg)
        public float averageSpeed;      // mean angular speed (deg/s)

        public int consistencyScore;    // 0-100
        public int overallScore;        // 0-100

        /// <summary>Down-sampled knee-angle trace so the results graph can be redrawn.</summary>
        public List<float> angleSamples = new List<float>();
        public List<float> timeSamples = new List<float>();

        public DateTime Date =>
            DateTime.TryParse(dateIso, null, System.Globalization.DateTimeStyles.RoundtripKind, out var d)
                ? d
                : DateTime.MinValue;

        public string DurationLabel
        {
            get
            {
                int total = (int)Math.Round(durationSeconds);
                int m = total / 60;
                int s = total % 60;
                if (m <= 0) return $"{s} sec";
                return s == 0 ? $"{m} min" : $"{m} min {s} sec";
            }
        }
    }

    /// <summary>Root wrapper so JsonUtility can serialize a list to/from a file.</summary>
    [Serializable]
    public class ExerciseHistoryFile
    {
        public List<ExerciseSession> sessions = new List<ExerciseSession>();
    }
}
