using UnityEngine;
using KneeRehab.ExerciseSystem;
using KneeRehab.Sensors;

namespace KneeRehab.Visualization
{
    /// <summary>
    /// The adapter that connects live knee-angle data to the 3D model WITHOUT the
    /// model knowing where the data comes from. It subscribes to ExerciseManager
    /// during a session, and otherwise can idle-follow the raw sensor so the model
    /// also moves on the dashboard / instruction preview.
    ///
    /// This is the concrete realization of the requirement: "the model should
    /// receive sensor values through a sensor-data interface" — the binder is the
    /// only thing touching both sides.
    ///
    /// ATTACH TO: same GameObject as KneeModelController (or any object).
    /// INSPECTOR: assign 'model' = the KneeModelController.
    /// </summary>
    public class KneeModelSensorBinder : MonoBehaviour
    {
        public KneeModelController model;

        [Tooltip("If true, also follow the raw sensor stream when no session is active.")]
        public bool followSensorWhenIdle = true;

        private void OnEnable()
        {
            if (ExerciseManager.Instance != null)
                ExerciseManager.Instance.SampleProcessed += OnSample;

            if (followSensorWhenIdle && SensorService.Instance != null)
                SensorService.Instance.NewData += OnRawSensor;
        }

        private void OnDisable()
        {
            if (ExerciseManager.Instance != null)
                ExerciseManager.Instance.SampleProcessed -= OnSample;

            if (SensorService.Instance != null)
                SensorService.Instance.NewData -= OnRawSensor;
        }

        // During a measured session, prefer the manager's (feedback-aligned) angle.
        private void OnSample(float angle, float speed)
        {
            if (model != null) model.SetKneeAngle(angle);
        }

        // Idle preview: follow raw sensor only when not actively measuring, so we
        // don't double-drive the model during a session.
        private void OnRawSensor(KneeSensorData data)
        {
            bool measuring = ExerciseManager.Instance != null && ExerciseManager.Instance.IsMeasuring;
            if (!measuring && model != null)
                model.SetKneeAngle(data.kneeAngle);
        }
    }
}
