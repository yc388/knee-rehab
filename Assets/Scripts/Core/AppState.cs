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
