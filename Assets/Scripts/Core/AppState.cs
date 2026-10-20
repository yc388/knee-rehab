using UnityEngine;
using KneeRehab.ExerciseSystem;

namespace KneeRehab.Core
{
    /// <summary>
    /// Tiny shared holder for the "currently chosen exercise" so screens can hand
    /// off selection -> instruction -> live without coupling to each other.
    ///
    /// Persistent singleton. ATTACH TO: a GameObject named "AppState".
    /// </summary>
    public class AppState : MonoBehaviour
    {
        public static AppState Instance { get; private set; }

        /// <summary>The exercise the user picked on the selection screen.</summary>
        public ExerciseData SelectedExercise { get; set; }

        /// <summary>
        /// User-chosen angles for the upcoming/active session. These override the
        /// exercise's built-in defaults and can be changed live. Start = resting
        /// (bent) position; Target = extension goal to reach. Defaults set when an
        /// exercise is selected.
        /// </summary>
        public float StartAngle { get; set; } = 90f;
        public float TargetAngle { get; set; } = 15f;

        /// <summary>The allowed preset angles for the pickers.</summary>
        public static readonly float[] AnglePresets = { 0f, 15f, 30f, 45f, 60f, 75f, 90f };

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }
    }
}
