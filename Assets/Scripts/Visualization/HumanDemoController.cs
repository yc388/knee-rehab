using UnityEngine;
using KneeRehab.Core;
using KneeRehab.ExerciseSystem;

namespace KneeRehab.Visualization
{
    /// <summary>
    /// Drives the human demo figure on the instruction screen.
    ///
    /// It supports TWO backends so it works now and upgrades later:
    ///   (1) PRIMITIVE mode (default): rotates a knee joint transform with a looping
    ///       flex/extend motion so the placeholder figure's leg actually bends. No
    ///       art assets needed.
    ///   (2) MIXAMO mode: if an Animator with named states is assigned, it plays the
    ///       matching looping clip per exercise instead. (See README for setup.)
    ///
    /// This is a REFERENCE demo loop (option B1) — independent of the live sensor.
    ///
    /// ATTACH TO: the human demo root GameObject.
    /// </summary>
    public class HumanDemoController : MonoBehaviour
    {
        [Header("Mixamo mode (optional)")]
        [Tooltip("If assigned with named states, plays clips instead of the primitive knee loop.")]
        public Animator animator;
        public string defaultState = "Idle";
        public float crossFade = 0.2f;

        [Header("Primitive mode")]
        [Tooltip("Knee joint whose child lower-leg rotates. If set, the figure's knee " +
                 "bends with a looping demo motion.")]
        public KneeModelController kneeModel;

        [Tooltip("Degrees the demo knee flexes between (start -> target -> start).")]
        public float demoStartAngle = 10f;
        public float demoTargetAngle = 90f;
        [Tooltip("Seconds for one full bend-and-return cycle.")]
        public float demoSecondsPerCycle = 3.5f;

        private string _currentState;
        private float _phase;
        private bool _useAnimator;

        private void OnEnable()
        {
            _useAnimator = animator != null && animator.runtimeAnimatorController != null;
            PlayForSelectedExercise();
        }

        /// <summary>
        /// Choose the demo for the currently selected exercise. In primitive mode this
        /// sets the flex range from the exercise's default angles; in Mixamo mode it
        /// plays the matching named state.
        /// </summary>
        public void PlayForSelectedExercise()
        {
            var ex = AppState.Instance != null ? AppState.Instance.SelectedExercise : null;

            if (_useAnimator)
            {
                string state = (ex != null && !string.IsNullOrEmpty(ex.demoClipName))
                    ? ex.demoClipName
                    : defaultState;
                PlayState(state);
                return;
            }

            // Primitive mode: pace the knee loop to the exercise's default range.
            if (ex != null)
            {
                demoStartAngle = Mathf.Min(ex.defaultStartAngle, ex.defaultTargetAngle);
                demoTargetAngle = Mathf.Max(ex.defaultStartAngle, ex.defaultTargetAngle);
                demoSecondsPerCycle = Mathf.Max(2f, ex.estimatedSecondsPerRep);
            }
            _phase = 0f;
        }

        private void PlayState(string stateName)
        {
            if (animator == null || string.IsNullOrEmpty(stateName)) return;
            if (_currentState == stateName) return;
            if (animator.HasState(0, Animator.StringToHash(stateName)))
            {
                animator.CrossFadeInFixedTime(stateName, crossFade);
                _currentState = stateName;
            }
            else if (animator.HasState(0, Animator.StringToHash(defaultState)))
            {
                animator.CrossFadeInFixedTime(defaultState, crossFade);
                _currentState = defaultState;
            }
        }

        private void Update()
        {
            if (_useAnimator || kneeModel == null) return;

            // Looping raised-cosine flex/extend so the demo knee bends smoothly.
            _phase += Time.deltaTime / Mathf.Max(1f, demoSecondsPerCycle);
            if (_phase >= 1f) _phase -= 1f;

            float tri = 0.5f * (1f - Mathf.Cos(_phase * 2f * Mathf.PI)); // 0->1->0
            float angle = Mathf.Lerp(demoStartAngle, demoTargetAngle, tri);
            kneeModel.SetKneeAngle(angle);
        }
    }
}
