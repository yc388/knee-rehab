using UnityEngine;
using KneeRehab.Core;

namespace KneeRehab.Visualization
{
    /// <summary>
    /// Plays a looping "how to do this exercise" demo animation on a humanoid model
    /// (e.g. a free Mixamo character) as a REFERENCE guide on the instruction screen.
    ///
    /// This is option "B1": a demo loop that is INDEPENDENT of the live sensor — it
    /// shows the patient how the movement should look, it does not react to IMU data.
    /// (The live 3D leg on the exercise screen is the sensor-driven one.)
    ///
    /// SETUP (one-time, with a free Mixamo character):
    ///   1. Download a character + the animations (Squat, Lunge, etc.) from
    ///      mixamo.com as FBX "with skin". Import into Assets/Models/.
    ///   2. Set each FBX rig to "Humanoid" and each clip to Loop Time = true.
    ///   3. Create an Animator Controller with one state per exercise, each state
    ///      NAMED exactly to match ExerciseData.demoClipName (e.g. "Squat", "Lunge",
    ///      "SeatedKneeExtension", "SitToStand"). Add a default idle state too.
    ///   4. Put the character under the LegCamera's view (SceneBuilder positions a
    ///      HumanDemoRoot for you), add this component, and assign 'animator'.
    ///
    /// If no animator/clips are present yet, this does nothing (the primitive leg
    /// still works), so the app runs fine before you add the character.
    ///
    /// ATTACH TO: the human demo root GameObject.
    /// </summary>
    public class HumanDemoController : MonoBehaviour
    {
        [Tooltip("Animator on the humanoid model. Its states should be named to match " +
                 "each exercise's demoClipName.")]
        public Animator animator;

        [Tooltip("Played when an exercise has no demoClipName, or as the resting pose.")]
        public string defaultState = "Idle";

        [Tooltip("Cross-fade time between demo clips, seconds.")]
        public float crossFade = 0.2f;

        private string _current;

        private void OnEnable()
        {
            PlayForSelectedExercise();
        }

        /// <summary>
        /// Called by the instruction screen when it appears. Chooses the clip for the
        /// currently selected exercise.
        /// </summary>
        public void PlayForSelectedExercise()
        {
            var ex = AppState.Instance != null ? AppState.Instance.SelectedExercise : null;
            string state = (ex != null && !string.IsNullOrEmpty(ex.demoClipName))
                ? ex.demoClipName
                : defaultState;
            Play(state);
        }

        public void Play(string stateName)
        {
            if (animator == null || string.IsNullOrEmpty(stateName)) return;
            if (_current == stateName) return;

            // Only play if the state actually exists, so a missing clip just leaves
            // the current animation running instead of erroring.
            if (animator.HasState(0, Animator.StringToHash(stateName)))
            {
                animator.CrossFadeInFixedTime(stateName, crossFade);
                _current = stateName;
            }
            else if (animator.HasState(0, Animator.StringToHash(defaultState)))
            {
                animator.CrossFadeInFixedTime(defaultState, crossFade);
                _current = defaultState;
            }
        }
    }
}
