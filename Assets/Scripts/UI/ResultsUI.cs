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
    /// Shows the performance results for a completed session: stats, the full
    /// knee-angle trace redrawn on a UILineGraph, a performance message, an
    /// improvement suggestion, and navigation buttons.
    ///
    /// Populate(session) is called by LiveExerciseUI right before the screen shows,
    /// and by ExerciseHistoryUI when the user taps a past session.
    ///
    /// ATTACH TO: the ExerciseResults panel root.
    /// INSPECTOR: assign all stat text fields, the results UILineGraph, and the
    /// three navigation buttons.
    /// </summary>
    public class ResultsUI : MonoBehaviour
    {
        [Header("Stats")]
        public TMP_Text exerciseNameText;
        public TMP_Text repsText;
        public TMP_Text maxFlexionText;
        public TMP_Text maxExtensionText;
        public TMP_Text maxRomText;
        public TMP_Text avgRomText;
        public TMP_Text avgSpeedText;
        public TMP_Text durationText;
        public TMP_Text consistencyText;
        public TMP_Text overallScoreText;

        [Header("Messages")]
        public TMP_Text performanceMessageText;
        public TMP_Text improvementText;

        [Header("Graph")]
        public UILineGraph graph;

        [Header("Navigation")]
        public Button repeatButton;
        public Button chooseAnotherButton;
        public Button dashboardButton;

        private ExerciseSession _session;

        private void Start()
        {
            if (repeatButton != null) repeatButton.onClick.AddListener(RepeatExercise);
            if (chooseAnotherButton != null)
                chooseAnotherButton.onClick.AddListener(() => ScreenManager.Instance.Show(AppScreen.ExerciseSelection));
            if (dashboardButton != null)
                dashboardButton.onClick.AddListener(() => ScreenManager.Instance.Show(AppScreen.Dashboard));
        }

        public void Populate(ExerciseSession s)
        {
            _session = s;
            if (s == null) return;

            if (exerciseNameText != null) exerciseNameText.text = s.exerciseName;
            if (repsText != null) repsText.text = $"{s.repetitionsCompleted} / {s.repetitionsTarget}";
            if (maxFlexionText != null) maxFlexionText.text = $"{s.maxFlexion:F0}°";
            if (maxExtensionText != null) maxExtensionText.text = $"{s.maxExtension:F0}°";
            if (maxRomText != null) maxRomText.text = $"{s.maxRom:F0}°";
            if (avgRomText != null) avgRomText.text = $"{s.averageRom:F0}°";
            if (avgSpeedText != null) avgSpeedText.text = $"{s.averageSpeed:F0}°/s";
            if (durationText != null) durationText.text = s.DurationLabel;
            if (consistencyText != null) consistencyText.text = $"{s.consistencyScore}%";
            if (overallScoreText != null) overallScoreText.text = $"{s.overallScore} / 100";

            if (graph != null)
            {
                graph.windowSeconds = 0f; // show whole trace
                graph.SetData(s.timeSamples, s.angleSamples);
            }

            if (performanceMessageText != null)
                performanceMessageText.text = BuildPerformanceMessage(s);
            if (improvementText != null)
                improvementText.text = BuildImprovementMessage(s);
        }

        private string BuildPerformanceMessage(ExerciseSession s)
        {
            if (s.overallScore >= 85)
                return "Excellent session. Your movement was consistent throughout most of the exercise.";
            if (s.overallScore >= 65)
                return "Good session. You completed the exercise with steady movement.";
            return "Session complete. Keep practising to build consistency and range.";
        }

        private string BuildImprovementMessage(ExerciseSession s)
        {
            // Non-diagnostic, encouraging suggestions based on the prototype score.
            if (s.consistencyScore < 70)
                return "Try to keep each repetition at a similar, controlled pace next time.";
            if (s.maxExtension > 25f)
                return "Try to achieve slightly greater knee extension during your next session.";
            return "Great range of motion — aim to maintain this in your next session.";
        }

        private void RepeatExercise()
        {
            var ex = AppState.Instance != null ? AppState.Instance.SelectedExercise : null;
            if (ex == null) { ScreenManager.Instance.Show(AppScreen.ExerciseSelection); return; }
            // Go back to instructions so the user can re-read + countdown again.
            ScreenManager.Instance.Show(AppScreen.ExerciseInstruction);
        }
    }
}
