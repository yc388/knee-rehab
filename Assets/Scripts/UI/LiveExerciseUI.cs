using UnityEngine;
using TMPro;
using KneeRehab.Core;
using KneeRehab.ExerciseSystem;
using KneeRehab.Visualization;
using KneeRehab.Data;

namespace KneeRehab.UI
{
    /// <summary>
    /// The live exercise HUD. Binds to ExerciseManager events/state and updates:
    /// exercise name, rep counter, big knee-angle number + gauge, ROM, speed, timer,
    /// and the large feedback message. It is a pure CONSUMER — it never reads the
    /// sensor directly.
    ///
    /// On SessionCompleted it hands the record to ResultsUI and shows the results.
    ///
    /// ATTACH TO: the LiveExercise panel root.
    /// INSPECTOR: assign all text refs, the AngleGauge, and (optionally) the
    /// ResultsUI reference so it can pre-populate results.
    /// </summary>
    public class LiveExerciseUI : MonoBehaviour
    {
        [Header("Primary readouts")]
        public TMP_Text exerciseNameText;
        public TMP_Text repCounterText;    // "6 / 10 Reps"
        public TMP_Text angleText;         // big "72°"
        public TMP_Text feedbackText;      // large feedback message
        public TMP_Text timerText;         // "00:42"
        public AngleGauge gauge;

        [Header("Secondary readouts")]
        public TMP_Text romText;           // "ROM: 76°"
        public TMP_Text speedText;         // "32°/second"

        [Header("Hand-off")]
        public ResultsUI resultsUI;

        private bool _subscribed;

        private void OnEnable()
        {
            Subscribe();
            RefreshStatic();
        }

        private void OnDisable()
        {
            Unsubscribe();
        }

        private void Subscribe()
        {
            if (_subscribed || ExerciseManager.Instance == null) return;
            var m = ExerciseManager.Instance;
            m.SampleProcessed += OnSample;
            m.RepCompleted += OnRep;
            m.FeedbackChanged += OnFeedback;
            m.SessionCompleted += OnSessionCompleted;
            _subscribed = true;
        }

        private void Unsubscribe()
        {
            if (!_subscribed || ExerciseManager.Instance == null) return;
            var m = ExerciseManager.Instance;
            m.SampleProcessed -= OnSample;
            m.RepCompleted -= OnRep;
            m.FeedbackChanged -= OnFeedback;
            m.SessionCompleted -= OnSessionCompleted;
            _subscribed = false;
        }

        private void RefreshStatic()
        {
            var m = ExerciseManager.Instance;
            if (m == null || m.CurrentExercise == null) return;

            if (exerciseNameText != null) exerciseNameText.text = m.CurrentExercise.exerciseName;
            if (gauge != null)
            {
                gauge.minAngle = 0f;
                gauge.maxAngle = Mathf.Max(120f, m.CurrentExercise.targetMaximumAngle + 20f);
            }
            UpdateRepCounter(m.RepCount);
            if (feedbackText != null) feedbackText.text = m.CurrentFeedback;
        }

        private void OnSample(float angle, float speed)
        {
            if (angleText != null) angleText.text = $"{angle:F0}°";
            if (gauge != null) gauge.SetAngle(angle);
            if (speedText != null) speedText.text = $"{speed:F0}°/second";

            var m = ExerciseManager.Instance;
            if (m != null && romText != null) romText.text = $"ROM: {m.CurrentRom:F0}°";
        }

        private void OnRep(int repNumber) => UpdateRepCounter(repNumber);

        private void UpdateRepCounter(int reps)
        {
            var m = ExerciseManager.Instance;
            int target = m != null ? m.TargetReps : 0;
            if (repCounterText != null) repCounterText.text = $"{reps} / {target} Reps";
        }

        private void OnFeedback(string msg)
        {
            if (feedbackText != null) feedbackText.text = msg;
        }

        private void Update()
        {
            var m = ExerciseManager.Instance;
            if (m == null || timerText == null) return;
            int total = Mathf.FloorToInt(m.ElapsedSeconds);
            timerText.text = $"{total / 60:00}:{total % 60:00}";
        }

        private void OnSessionCompleted(ExerciseSession session)
        {
            if (resultsUI != null) resultsUI.Populate(session);
            ScreenManager.Instance.Show(AppScreen.ExerciseResults);
        }
    }
}
