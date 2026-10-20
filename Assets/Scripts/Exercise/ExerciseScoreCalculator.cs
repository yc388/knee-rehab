using System.Collections.Generic;
using UnityEngine;

namespace KneeRehab.ExerciseSystem
{
    /// <summary>
    /// Result bundle returned by the scorer. Values are 0-100 for the sub-scores
    /// and the overall. This is a PROTOTYPE performance score, NOT a clinical or
    /// diagnostic measure.
    /// </summary>
    public struct ScoreBreakdown
    {
        public float romScore;          // 0-100
        public float completionScore;   // 0-100
        public float consistencyScore;  // 0-100
        public float speedScore;        // 0-100
        public int overall;             // 0-100, weighted
    }

    /// <summary>
    /// Isolated, easily-tweakable scoring formula. Pure C#, no Unity UI deps.
    ///
    /// Weights (as specified):
    ///   40% Range of Motion
    ///   25% Repetition Completion
    ///   20% Movement Consistency
    ///   15% Movement Speed
    ///
    /// Keep ALL scoring tuning in this one file so it can be adjusted without
    /// touching the rest of the app.
    /// </summary>
    public static class ExerciseScoreCalculator
    {
        public const float WeightRom = 0.40f;
        public const float WeightCompletion = 0.25f;
        public const float WeightConsistency = 0.20f;
        public const float WeightSpeed = 0.15f;

        /// <summary>
        /// Compute the breakdown.
        /// </summary>
        /// <param name="achievedAverageRom">Average ROM achieved across reps (deg).</param>
        /// <param name="targetRom">The exercise's target ROM (deg).</param>
        /// <param name="completedReps">Reps actually completed.</param>
        /// <param name="targetReps">Reps targeted.</param>
        /// <param name="perRepRom">ROM per rep, for consistency (lower variance = better).</param>
        /// <param name="averageSpeed">Average angular speed (deg/s).</param>
        /// <param name="idealSpeedMin">Lower bound of the "good" speed band (deg/s).</param>
        /// <param name="idealSpeedMax">Upper bound of the "good" speed band (deg/s).</param>
        public static ScoreBreakdown Calculate(
            float achievedAverageRom,
            float targetRom,
            int completedReps,
            int targetReps,
            IReadOnlyList<float> perRepRom,
            float averageSpeed,
            float idealSpeedMin = 20f,
            float idealSpeedMax = 60f)
        {
            var b = new ScoreBreakdown();

            // --- ROM: how close the achieved average is to the target (capped at 100). ---
            b.romScore = targetRom <= 0f
                ? 0f
                : Mathf.Clamp01(achievedAverageRom / targetRom) * 100f;

            // --- Completion: fraction of target reps done. ---
            b.completionScore = targetReps <= 0
                ? 0f
                : Mathf.Clamp01((float)completedReps / targetReps) * 100f;

            // --- Consistency: lower coefficient of variation in per-rep ROM = higher. ---
            b.consistencyScore = ConsistencyScore(perRepRom);

            // --- Speed: 100 inside the ideal band, falling off outside it. ---
            b.speedScore = SpeedScore(averageSpeed, idealSpeedMin, idealSpeedMax);

            float overall =
                b.romScore * WeightRom +
                b.completionScore * WeightCompletion +
                b.consistencyScore * WeightConsistency +
                b.speedScore * WeightSpeed;

            b.overall = Mathf.RoundToInt(Mathf.Clamp(overall, 0f, 100f));
            return b;
        }

        /// <summary>
        /// 100% when every rep has the same ROM; decreases as variability grows.
        /// Uses coefficient of variation (stddev / mean).
        /// </summary>
        public static float ConsistencyScore(IReadOnlyList<float> perRepRom)
        {
            if (perRepRom == null || perRepRom.Count < 2) return 100f;

            float mean = 0f;
            for (int i = 0; i < perRepRom.Count; i++) mean += perRepRom[i];
            mean /= perRepRom.Count;
            if (mean <= 0.0001f) return 0f;

            float variance = 0f;
            for (int i = 0; i < perRepRom.Count; i++)
            {
                float d = perRepRom[i] - mean;
                variance += d * d;
            }
            variance /= perRepRom.Count;
            float stdDev = Mathf.Sqrt(variance);

            float cv = stdDev / mean;             // 0 = perfectly consistent
            float score = (1f - cv * 2f) * 100f;  // cv of 0.5 -> 0
            return Mathf.Clamp(score, 0f, 100f);
        }

        /// <summary>
        /// Full marks inside [min,max]; linear falloff to 0 at double the band width
        /// outside it (too slow or too fast).
        /// </summary>
        public static float SpeedScore(float speed, float min, float max)
        {
            if (speed >= min && speed <= max) return 100f;

            float bandWidth = Mathf.Max(1f, max - min);
            float distance = speed < min ? (min - speed) : (speed - max);
            float score = (1f - distance / bandWidth) * 100f;
            return Mathf.Clamp(score, 0f, 100f);
        }
    }
}
