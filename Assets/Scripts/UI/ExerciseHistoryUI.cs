using UnityEngine;
using UnityEngine.UI;
using TMPro;
using KneeRehab.Core;
using KneeRehab.Data;

namespace KneeRehab.UI
{
    /// <summary>
    /// Lists saved sessions newest-first in a scrollable list. Selecting a row opens
    /// the full results for that session via ResultsUI.
    ///
    /// ATTACH TO: the ExerciseHistory panel root.
    /// INSPECTOR:
    ///   - rowPrefab    : the HistoryRow prefab.
    ///   - rowContainer : content transform of a ScrollRect (with Vertical Layout).
    ///   - emptyLabel   : shown when there are no sessions.
    ///   - backButton / progressButton
    ///   - resultsUI    : to open a selected session.
    /// </summary>
    public class ExerciseHistoryUI : MonoBehaviour
    {
        public HistoryRow rowPrefab;
        public Transform rowContainer;
        public TMP_Text emptyLabel;
        public Button backButton;
        public Button progressButton;
        public ResultsUI resultsUI;

        private void Start()
        {
            if (backButton != null)
                backButton.onClick.AddListener(() => ScreenManager.Instance.Show(AppScreen.Dashboard));
            if (progressButton != null)
                progressButton.onClick.AddListener(() => ScreenManager.Instance.Show(AppScreen.Progress));
        }

        private void OnEnable()
        {
            Rebuild();
            if (ExerciseHistoryManager.Instance != null)
                ExerciseHistoryManager.Instance.HistoryChanged += Rebuild;
        }

        private void OnDisable()
        {
            if (ExerciseHistoryManager.Instance != null)
                ExerciseHistoryManager.Instance.HistoryChanged -= Rebuild;
        }

        private void Rebuild()
        {
            if (rowContainer == null || rowPrefab == null) return;

            for (int i = rowContainer.childCount - 1; i >= 0; i--)
                Destroy(rowContainer.GetChild(i).gameObject);

            var sessions = ExerciseHistoryManager.Instance != null
                ? ExerciseHistoryManager.Instance.GetSessions()
                : new System.Collections.Generic.List<ExerciseSession>();

            if (emptyLabel != null) emptyLabel.gameObject.SetActive(sessions.Count == 0);

            foreach (var s in sessions)
            {
                var row = Instantiate(rowPrefab, rowContainer);
                row.gameObject.SetActive(true);
                row.Bind(s, OpenSession);
            }
        }

        private void OpenSession(ExerciseSession s)
        {
            if (resultsUI != null) resultsUI.Populate(s);
            ScreenManager.Instance.Show(AppScreen.ExerciseResults);
        }
    }
}
