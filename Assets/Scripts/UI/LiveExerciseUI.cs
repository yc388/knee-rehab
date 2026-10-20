using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using KneeRehab.Core;
using KneeRehab.ExerciseSystem;
using KneeRehab.Visualization;
using KneeRehab.Data;

namespace KneeRehab.UI
{
    /// <summary>
    /// The live exercise HUD. Binds to ExerciseManager events/state and updates:
    /// exercise name, rep counter (+ good reps), big knee-angle number + gauge, ROM,
    /// speed, timer, the large feedback message, the live angle pickers (start +
    /// target), and the Stop button. Pure CONSUMER — never reads the sensor directly.
    ///
    /// On SessionCompleted it hands the record to ResultsUI and shows the results.
    ///
    /// ATTACH TO: the LiveExercise panel root. (SceneBuilder wires all refs.)
    /// </summary>
    public class LiveExerciseUI : MonoBehaviour
    {
        [Header("Primary readouts")]
        public TMP_Text exerciseNameText;
        public TMP_Text repCounterText;    // "6 / 10 Reps"
        public TMP_Text goodRepText;       // "4 good"
        public TMP_Text angleText;         // big "72°"
        public TMP_Text targetReadoutText; // "Target 15° · Start 90°"
        public TMP_Text feedbackText;      // large feedback message
        public TMP_Text timerText;         // "00:42"
        public AngleGauge gauge;

        [Header("Secondary readouts")]
        public TMP_Text romText;           // "ROM: 76°"
        public TMP_Text speedText;         // "32°/second"

        [Header("Angle pickers (live)")]
        public Transform startPickerContainer;  // holds the start-angle preset buttons
        public Transform targetPickerContainer;  // holds the target-angle preset buttons
        public Button anglePresetButtonPrefab;    // simple prefab for a preset button

        [Header("Controls")]
        public Button stopButton;

        [Header("Hand-off")]
        public ResultsUI resultsUI;

        private bool _subscribed;
        private readonly List<Button> _startButtons = new List<Button>();
        private readonly List<Button> _targetButtons = new List<Button>();

        private void OnEnable()
        {
            Subscribe();
            BuildPickers();
            RefreshStatic();
        }

        private void OnDisable() => Unsubscribe();

        private void Start()
        {
            if (stopButton != null)
                stopButton.onClick.AddListener(OnStopPressed);
        }

        private void Subscribe()
        {
            if (_subscribed || ExerciseManager.Instance == null) return;
            var m = ExerciseManager.Instance;
            m.SampleProcessed += OnSample;
            m.RepCompleted += OnRep;
            m.FeedbackChanged += OnFeedback;
            m.SessionCompleted += OnSessionCompleted;
            m.TargetAngleChanged += OnTargetChanged;
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
            m.TargetAngleChanged -= OnTargetChanged;
            _subscribed = false;
        }

        // ---- Angle preset pickers ----------------------------------------
        private void BuildPickers()
        {
            if (anglePresetButtonPrefab == null) return;

            BuildPickerRow(startPickerContainer, _startButtons, isStart: true);
            BuildPickerRow(targetPickerContainer, _targetButtons, isStart: false);
            HighlightSelections();
        }

        private void BuildPickerRow(Transform container, List<Button> store, bool isStart)
        {
            if (container == null) return;

            // Clear existing (rebuild each time the screen is shown).
            for (int i = container.childCount - 1; i >= 0; i--)
                Destroy(container.GetChild(i).gameObject);
            store.Clear();

            foreach (float preset in AppState.AnglePresets)
            {
                var btn = Instantiate(anglePresetButtonPrefab, container);
                btn.gameObject.SetActive(true);
                var label = btn.GetComponentInChildren<TMP_Text>();
                if (label != null) label.text = $"{preset:F0}°";
                float captured = preset;
                btn.onClick.AddListener(() =>
                {
                    if (isStart) ExerciseManager.Instance.SetStartAngle(captured);
                    else ExerciseManager.Instance.SetTargetAngle(captured);
                    HighlightSelections();
                    RefreshTargetReadout();
                });
                store.Add(btn);
            }
        }

        private void HighlightSelections()
        {
            var m = ExerciseManager.Instance;
            if (m == null) return;
            HighlightRow(_startButtons, m.StartAngle);
            HighlightRow(_targetButtons, m.TargetAngle);
        }

        private void HighlightRow(List<Button> buttons, float selected)
        {
            for (int i = 0; i < buttons.Count; i++)
            {
                if (i >= AppState.AnglePresets.Length) break;
                bool isSel = Mathf.Approximately(AppState.AnglePresets[i], selected);
                var img = buttons[i].GetComponent<Image>();
                if (img != null)
                    img.color = isSel ? new Color(0.16f, 0.55f, 0.72f) : new Color(0.80f, 0.85f, 0.90f);
                var label = buttons[i].GetComponentInChildren<TMP_Text>();
                if (label != null) label.color = isSel ? Color.white : new Color(0.25f, 0.3f, 0.35f);
            }
        }

        // ---- Static / per-frame refresh ----------------------------------
        private void RefreshStatic()
        {
            var m = ExerciseManager.Instance;
            if (m == null || m.CurrentExercise == null) return;

            if (exerciseNameText != null) exerciseNameText.text = m.CurrentExercise.exerciseName;
            if (gauge != null)
            {
                gauge.minAngle = 0f;
                gauge.maxAngle = Mathf.Max(120f, m.StartAngle + 20f);
            }
            UpdateRepCounter(m.RepCount);
            if (feedbackText != null) feedbackText.text = m.CurrentFeedback;
            RefreshTargetReadout();
        }

        private void RefreshTargetReadout()
        {
            var m = ExerciseManager.Instance;
            if (m == null || targetReadoutText == null) return;
            targetReadoutText.text = $"Start {m.StartAngle:F0}°   •   Target {m.TargetAngle:F0}°";
        }

        private void OnSample(float angle, float speed)
        {
            if (angleText != null) angleText.text = $"{angle:F0}°";
            if (gauge != null) gauge.SetAngle(angle);
            if (speedText != null) speedText.text = $"{speed:F0}°/second";

            var m = ExerciseManager.Instance;
            if (m != null && romText != null) romText.text = $"ROM: {m.CurrentRom:F0}°";
        }

        private void OnRep(int repNumber, bool wasGood) => UpdateRepCounter(repNumber);

        private void UpdateRepCounter(int reps)
        {
            var m = ExerciseManager.Instance;
            int target = m != null ? m.TargetReps : 0;
            if (repCounterText != null) repCounterText.text = $"{reps} / {target} Reps";
            if (goodRepText != null && m != null) goodRepText.text = $"{m.GoodRepCount} good";
        }

        private void OnFeedback(string msg)
        {
            if (feedbackText != null) feedbackText.text = msg;
        }

        private void OnTargetChanged(float target)
        {
            RefreshTargetReadout();
            HighlightSelections();
        }

        private void OnStopPressed()
        {
            if (ExerciseManager.Instance != null)
                ExerciseManager.Instance.StopSessionEarly();
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
