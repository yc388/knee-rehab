using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using KneeRehab.Core;
using KneeRehab.ExerciseSystem;

namespace KneeRehab.UI
{
    /// <summary>
    /// Shows the instructions for the selected exercise, then runs the 3-2-1-Start
    /// countdown overlay before switching to the live screen and telling the
    /// ExerciseManager to begin measuring.
    ///
    /// ATTACH TO: the ExerciseInstruction panel root.
    /// INSPECTOR: assign the text fields, Back/Start buttons, and the countdown
    /// overlay + its label.
    /// </summary>
    public class ExerciseInstructionUI : MonoBehaviour
    {
        [Header("Content")]
        public TMP_Text nameText;
        public TMP_Text instructionsText;
        public TMP_Text repsText;
        public TMP_Text romText;
        public TMP_Text durationText;
        public TMP_Text safetyText;
        public Image illustration;

        [Header("Angle pickers (set before starting)")]
        public Transform startPickerContainer;
        public Transform targetPickerContainer;
        public Button anglePresetButtonPrefab;
        public TMP_Text angleSummaryText;

        [Header("Buttons")]
        public Button backButton;
        public Button startButton;

        [Header("Countdown overlay")]
        public GameObject countdownOverlay; // full-screen dim panel
        public TMP_Text countdownLabel;
        public float countdownStepSeconds = 1f;

        private readonly System.Collections.Generic.List<Button> _startButtons = new System.Collections.Generic.List<Button>();
        private readonly System.Collections.Generic.List<Button> _targetButtons = new System.Collections.Generic.List<Button>();

        private void Start()
        {
            if (backButton != null)
                backButton.onClick.AddListener(() => ScreenManager.Instance.Show(AppScreen.ExerciseSelection));
            if (startButton != null)
                startButton.onClick.AddListener(StartPressed);
            if (countdownOverlay != null) countdownOverlay.SetActive(false);
        }

        private void OnEnable()
        {
            Populate();
            BuildPickers();
            if (countdownOverlay != null) countdownOverlay.SetActive(false);
        }

        private void BuildPickers()
        {
            if (anglePresetButtonPrefab == null) return;
            BuildPickerRow(startPickerContainer, _startButtons, isStart: true);
            BuildPickerRow(targetPickerContainer, _targetButtons, isStart: false);
            HighlightSelections();
            RefreshAngleSummary();
        }

        private void BuildPickerRow(Transform container, System.Collections.Generic.List<Button> store, bool isStart)
        {
            if (container == null) return;
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
                    if (isStart) AppState.Instance.StartAngle = captured;
                    else AppState.Instance.TargetAngle = captured;
                    HighlightSelections();
                    RefreshAngleSummary();
                });
                store.Add(btn);
            }
        }

        private void HighlightSelections()
        {
            if (AppState.Instance == null) return;
            HighlightRow(_startButtons, AppState.Instance.StartAngle);
            HighlightRow(_targetButtons, AppState.Instance.TargetAngle);
        }

        private void HighlightRow(System.Collections.Generic.List<Button> buttons, float selected)
        {
            for (int i = 0; i < buttons.Count && i < AppState.AnglePresets.Length; i++)
            {
                bool isSel = Mathf.Approximately(AppState.AnglePresets[i], selected);
                var img = buttons[i].GetComponent<Image>();
                if (img != null)
                    img.color = isSel ? new Color(0.16f, 0.55f, 0.72f) : new Color(0.80f, 0.85f, 0.90f);
                var label = buttons[i].GetComponentInChildren<TMP_Text>();
                if (label != null) label.color = isSel ? Color.white : new Color(0.25f, 0.3f, 0.35f);
            }
        }

        private void RefreshAngleSummary()
        {
            if (angleSummaryText == null || AppState.Instance == null) return;
            angleSummaryText.text =
                $"Start {AppState.Instance.StartAngle:F0}°   •   Target {AppState.Instance.TargetAngle:F0}°";
        }

        private void Populate()
        {
            var ex = AppState.Instance != null ? AppState.Instance.SelectedExercise : null;
            if (ex == null) return;

            if (nameText != null) nameText.text = ex.exerciseName;
            if (instructionsText != null) instructionsText.text = ex.instructions;
            if (repsText != null) repsText.text = $"Recommended: {ex.targetRepetitions} repetitions";
            if (romText != null)
                romText.text = $"Target range: {ex.targetMinimumAngle:F0}° – {ex.targetMaximumAngle:F0}°";
            if (durationText != null)
            {
                int secs = Mathf.RoundToInt(ex.EstimatedTotalSeconds);
                durationText.text = $"Duration: about {secs / 60}m {secs % 60}s";
            }
            if (safetyText != null) safetyText.text = ex.safetyReminder;
            if (illustration != null && ex.icon != null) illustration.sprite = ex.icon;
        }

        private void StartPressed()
        {
            var ex = AppState.Instance != null ? AppState.Instance.SelectedExercise : null;
            if (ex == null) return;

            // Prepare the session now so the simulator is paced before countdown ends.
            ExerciseManager.Instance.BeginSession(ex);
            StartCoroutine(CountdownRoutine());
        }

        private IEnumerator CountdownRoutine()
        {
            if (startButton != null) startButton.interactable = false;

            if (countdownOverlay != null) countdownOverlay.SetActive(true);

            for (int n = 3; n >= 1; n--)
            {
                if (countdownLabel != null) countdownLabel.text = n.ToString();
                yield return new WaitForSeconds(countdownStepSeconds);
            }
            if (countdownLabel != null) countdownLabel.text = "Start";
            yield return new WaitForSeconds(countdownStepSeconds * 0.6f);

            if (countdownOverlay != null) countdownOverlay.SetActive(false);
            if (startButton != null) startButton.interactable = true;

            // Switch to the live screen, then start measuring.
            ScreenManager.Instance.Show(AppScreen.LiveExercise);
            ExerciseManager.Instance.StartMeasuring();
        }
    }
}
