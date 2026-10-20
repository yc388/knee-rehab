using UnityEngine;

namespace KneeRehab.ExerciseSystem
{
    public enum ExerciseDifficulty { Easy, Moderate, Challenging }

    /// <summary>
    /// How an exercise is performed, which drives the simulator waveform and the
    /// repetition detector. Seated extension starts flexed (~90) and extends toward
    /// straight (~20). Other exercises can invert or shift this later.
    /// </summary>
    public enum ExerciseType
    {
        SeatedKneeExtension, // start flexed -> extend -> return
        StandingKneeFlexion, // start straight -> flex -> return
        SitToStand,
        StraightLegRaise
    }

    /// <summary>
    /// A reusable, data-only definition of one rehabilitation exercise. Authored as
    /// an asset (right-click: Create > Knee Rehab > Exercise) so new exercises are
    /// added with NO code changes. Everything the app needs to drive the full flow
    /// for an exercise lives here.
    ///
    /// Angle fields use the flexion convention: 0 = straight, 90 = bent.
    /// </summary>
    [CreateAssetMenu(fileName = "NewExercise", menuName = "Knee Rehab/Exercise", order = 0)]
    public class ExerciseData : ScriptableObject
    {
        [Header("Identity")]
        public string exerciseName = "Seated Knee Extension";
        public ExerciseType exerciseType = ExerciseType.SeatedKneeExtension;
        public ExerciseDifficulty difficulty = ExerciseDifficulty.Easy;

        [Tooltip("Optional card icon / illustration. Leave empty to use a placeholder.")]
        public Sprite icon;

        [Header("Patient-facing copy")]
        [TextArea(2, 4)]
        public string shortDescription =
            "Gently straighten the knee from a seated position to improve extension range.";

        [TextArea(4, 10)]
        public string instructions =
            "Sit upright on a chair with both feet on the floor.\n" +
            "Slowly extend your knee until your leg is nearly straight.\n" +
            "Hold the position briefly.\n" +
            "Slowly return your leg to the starting position.";

        [TextArea(1, 3)]
        public string safetyReminder =
            "Move slowly and stop if you feel sharp pain. This app provides exercise " +
            "feedback only and is not a medical diagnosis.";

        [Header("Targets")]
        [Min(1)] public int targetRepetitions = 10;

        [Tooltip("Most-extended target (small angle = straighter leg).")]
        public float targetMinimumAngle = 20f;

        [Tooltip("Resting / start target (large angle = more bent).")]
        public float targetMaximumAngle = 90f;

        [Tooltip("Shown on the card. Also used to pace the simulator (per-rep seconds).")]
        public float estimatedSecondsPerRep = 4f;

        [Header("Repetition detection thresholds")]
        [Tooltip("Enter EXTENDED state once angle drops below this (leg nearly straight).")]
        public float extendedEnterThreshold = 35f;

        [Tooltip("Count the rep complete once angle climbs back above this (returned).")]
        public float returnedThreshold = 75f;

        /// <summary>Total estimated duration in seconds (for the card).</summary>
        public float EstimatedTotalSeconds => targetRepetitions * estimatedSecondsPerRep;

        /// <summary>Human-readable range-of-motion target, e.g. "70° ROM target".</summary>
        public float TargetRom => Mathf.Abs(targetMaximumAngle - targetMinimumAngle);

        public string DifficultyLabel => difficulty switch
        {
            ExerciseDifficulty.Easy => "Easy",
            ExerciseDifficulty.Moderate => "Moderate",
            ExerciseDifficulty.Challenging => "Challenging",
            _ => difficulty.ToString()
        };
    }
}
