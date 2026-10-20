using UnityEngine;
using UnityEngine.UI;

namespace KneeRehab.Visualization
{
    /// <summary>
    /// A simple radial gauge for the current knee angle. Driven by a filled Image
    /// (Image.type = Filled, Radial 360 or Horizontal). SetAngle maps the angle
    /// within [minAngle, maxAngle] to fillAmount 0..1.
    ///
    /// ATTACH TO: the gauge GameObject that also has the fill Image.
    /// INSPECTOR: assign 'fillImage' (a Filled Image). Optionally a needle Transform.
    /// </summary>
    public class AngleGauge : MonoBehaviour
    {
        public Image fillImage;
        public float minAngle = 0f;
        public float maxAngle = 120f;

        [Header("Optional needle")]
        public RectTransform needle;
        public float needleMinZ = 90f;   // rotation at minAngle
        public float needleMaxZ = -90f;  // rotation at maxAngle

        [Header("Smoothing")]
        public float smoothing = 10f;

        private float _target;
        private float _shown;

        public void SetAngle(float angle)
        {
            _target = Mathf.Clamp(angle, minAngle, maxAngle);
        }

        private void Update()
        {
            _shown = Mathf.Lerp(_shown, _target, 1f - Mathf.Exp(-smoothing * Time.deltaTime));
            float t = Mathf.InverseLerp(minAngle, maxAngle, _shown);

            if (fillImage != null) fillImage.fillAmount = t;
            if (needle != null)
            {
                float z = Mathf.Lerp(needleMinZ, needleMaxZ, t);
                needle.localRotation = Quaternion.Euler(0f, 0f, z);
            }
        }
    }
}
