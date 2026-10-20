using System;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using KneeRehab.Data;

namespace KneeRehab.UI
{
    /// <summary>
    /// One row in the scrollable exercise-history list. Clicking it opens the full
    /// results for that session.
    ///
    /// ATTACH TO: the history row prefab (SceneBuilder generates it).
    /// INSPECTOR: assign the text fields and the Button.
    /// </summary>
    public class HistoryRow : MonoBehaviour
    {
        public TMP_Text dateText;
        public TMP_Text exerciseText;
        public TMP_Text summaryText;
        public TMP_Text scoreText;
        public Button button;

        public void Bind(ExerciseSession s, Action<ExerciseSession> onClick)
        {
            if (dateText != null) dateText.text = s.Date.ToLocalTime().ToString("MMM d, HH:mm");
            if (exerciseText != null) exerciseText.text = s.exerciseName;
            if (summaryText != null)
                summaryText.text = $"{s.repetitionsCompleted} reps · ROM {s.maxRom:F0}° · {s.DurationLabel}";
            if (scoreText != null) scoreText.text = $"{s.overallScore}";

            if (button != null)
            {
                button.onClick.RemoveAllListeners();
                button.onClick.AddListener(() => onClick?.Invoke(s));
            }
        }
    }
}
