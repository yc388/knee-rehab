using System;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using KneeRehab.ExerciseSystem;

namespace KneeRehab.UI
{
    /// <summary>
    /// A single exercise card in the selection grid. Populated from an ExerciseData
    /// asset. Clicking its button invokes the OnSelected callback the grid supplies.
    ///
    /// ATTACH TO: the card prefab root (SceneBuilder generates this prefab).
    /// INSPECTOR: assign the text/image/button references.
    /// </summary>
    public class ExerciseCard : MonoBehaviour
    {
        public TMP_Text nameText;
        public TMP_Text descriptionText;
        public TMP_Text repsText;
        public TMP_Text durationText;
        public TMP_Text difficultyText;
        public Image iconImage;
        public Button startButton;

        private ExerciseData _data;
        private Action<ExerciseData> _onSelected;

        public void Bind(ExerciseData data, Action<ExerciseData> onSelected)
        {
            _data = data;
            _onSelected = onSelected;

            if (nameText != null) nameText.text = data.exerciseName;
            if (descriptionText != null) descriptionText.text = data.shortDescription;
            if (repsText != null) repsText.text = $"{data.targetRepetitions} reps";
            if (durationText != null)
            {
                int secs = Mathf.RoundToInt(data.EstimatedTotalSeconds);
                durationText.text = $"~{secs / 60}m {secs % 60}s";
            }
            if (difficultyText != null) difficultyText.text = data.DifficultyLabel;
            if (iconImage != null && data.icon != null) iconImage.sprite = data.icon;

            if (startButton != null)
            {
                startButton.onClick.RemoveAllListeners();
                startButton.onClick.AddListener(() => _onSelected?.Invoke(_data));
            }
        }
    }
}
