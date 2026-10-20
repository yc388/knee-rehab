using UnityEngine;

namespace KneeRehab.Visualization
{
    /// <summary>
    /// Rotates a lower-leg transform around the knee joint based on a knee-angle
    /// value. Deliberately DECOUPLED from the sensor: it exposes SetKneeAngle(float)
    /// and does not know whether the angle is simulated or real. A binder script
    /// (KneeModelSensorBinder) feeds it from ExerciseManager.SampleProcessed.
    ///
    /// Model layout expected (built by SceneBuilder):
    ///   UpperLeg (fixed)
    ///     └─ KneeJoint (this.transform's target pivot)
    ///          └─ LowerLeg  <-- we rotate this around the knee pivot
    ///
    /// Angle convention: 0° = leg straight, 90° = bent. We map that to a local
    /// rotation about the knee's X axis. Tune StraightEuler/BentEuler in the
    /// Inspector to match whatever placeholder mesh you use.
    ///
    /// ATTACH TO: the "KneeModelController" GameObject (e.g. the model root).
    /// INSPECTOR: assign lowerLeg = the LowerLeg transform.
    /// </summary>
    public class KneeModelController : MonoBehaviour
    {
        [Header("References")]
        [Tooltip("The lower-leg transform that pivots at the knee.")]
        public Transform lowerLeg;

        [Header("Rotation mapping (local Euler about the knee)")]
        [Tooltip("LowerLeg local rotation when the knee is fully straight (angle = 0).")]
        public Vector3 straightEuler = new Vector3(0f, 0f, 0f);

        [Tooltip("LowerLeg local rotation when the knee is bent to referenceBentAngle.")]
        public Vector3 bentEuler = new Vector3(-90f, 0f, 0f);

        [Tooltip("The knee angle (deg) that 'bentEuler' corresponds to.")]
        public float referenceBentAngle = 90f;

        [Header("Smoothing")]
        [Tooltip("Higher = snappier. Visual smoothing only; data is unchanged.")]
        public float smoothing = 12f;

        private float _targetAngle;
        private float _displayedAngle;
        private Quaternion _straightRot;
        private Quaternion _bentRot;

        private void Awake()
        {
            _straightRot = Quaternion.Euler(straightEuler);
            _bentRot = Quaternion.Euler(bentEuler);
        }

        /// <summary>
        /// Feed a knee angle in degrees (0 = straight, 90 = bent). Called by the
        /// binder every sample. Safe to call at any rate.
        /// </summary>
        public void SetKneeAngle(float angleDegrees)
        {
            _targetAngle = angleDegrees;
        }

        private void Update()
        {
            // Smoothly approach the target angle for a natural look.
            _displayedAngle = Mathf.Lerp(
                _displayedAngle,
                _targetAngle,
                1f - Mathf.Exp(-smoothing * Time.deltaTime));

            if (lowerLeg == null) return;

            float t = referenceBentAngle <= 0f ? 0f : _displayedAngle / referenceBentAngle;
            lowerLeg.localRotation = Quaternion.Slerp(_straightRot, _bentRot, t);
        }
    }
}
