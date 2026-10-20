using UnityEngine;
using UnityEngine.UI;
using TMPro;
using KneeRehab.Core;
using KneeRehab.ExerciseSystem;

namespace KneeRehab.UI
{
    /// <summary>
    /// Builds the exercise selection grid from a list of ExerciseData assets by
    /// instantiating one ExerciseCard prefab per exercise. Adding a new exercise is
    /// purely data: create the asset, drop it in the 'exercises' list — no code.
    ///
    /// ATTACH TO: the ExerciseSelection panel root.
    /// INSPECTOR:
    ///   - exercises      : the ExerciseData assets to show (drag assets in).
    ///   - cardPrefab     : the ExerciseCard prefab.
    ///   - cardContainer  : the Transform (with a Grid/Vertical Layout Group) to
    ///                      parent cards under.
    ///   - backButton     : returns to dashboard.
    /// </summary>
    public class ExerciseSelectionUI : MonoBehaviour
    {
        [Header("Data")]
        public ExerciseData[] exercises;

        [Header("UI")]
        public ExerciseCard cardPrefab;
        public Transform cardContainer;
        public Button backButton;
        public TMP_Text titleText;

        private bool _built;

        private void Start()
        {
            if (titleText != null) titleText.text = "Choose an Exercise";
            if (backButton != null)
                backButton.onClick.AddListener(() => ScreenManager.Instance.Show(AppScreen.Dashboard));
            BuildCards();
        }

        private void OnEnable()
        {
            // Rebuild in case the asset list changed in the editor between shows.
            if (_built) return;
            BuildCards();
        }

        private void BuildCards()
        {
            if (cardPrefab == null || cardContainer == null || exercises == null) return;

            // Clear any existing children (e.g. design-time placeholders).
            for (int i = cardContainer.childCount - 1; i >= 0; i--)
                Destroy(cardContainer.GetChild(i).gameObject);

            foreach (var ex in exercises)
            {
                if (ex == null) continue;
                var card = Instantiate(cardPrefab, cardContainer);
                card.gameObject.SetActive(true);
                card.Bind(ex, OnExerciseChosen);
            }
            _built = true;
        }

        private void OnExerciseChosen(ExerciseData exercise)
        {
            AppState.Instance.SelectedExercise = exercise;
            // Seed the angle pickers with this exercise's sensible defaults.
            AppState.Instance.StartAngle = exercise.targetMaximumAngle;
            AppState.Instance.TargetAngle = exercise.targetMinimumAngle;
            ScreenManager.Instance.Show(AppScreen.ExerciseInstruction);
        }
    }
}
