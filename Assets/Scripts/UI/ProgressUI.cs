using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using KneeRehab.Core;
using KneeRehab.Data;
using KneeRehab.Visualization;

namespace KneeRehab.UI
{
    /// <summary>
    /// Shows rehabilitation progress across sessions as simple line charts:
    ///   - Best ROM over time
    ///   - Overall score over time
    /// Each chart is a UILineGraph fed one point per past session (oldest -> newest).
    ///
    /// ATTACH TO: the Progress panel root.
    /// INSPECTOR: assign the two UILineGraphs, labels, and the back button.
    /// </summary>
    public class ProgressUI : MonoBehaviour
    {
        public UILineGraph romGraph;
        public UILineGraph scoreGraph;
        public TMP_Text romSummaryText;
        public TMP_Text scoreSummaryText;
        public TMP_Text emptyLabel;
        public Button backButton;

        private void Start()
        {
            if (backButton != null)
                backButton.onClick.AddListener(() => ScreenManager.Instance.Show(AppScreen.Dashboard));
        }

        private void OnEnable() => Rebuild();

        private void Rebuild()
        {
            var sessions = ExerciseHistoryManager.Instance != null
                ? ExerciseHistoryManager.Instance.GetSessions()
                : new List<ExerciseSession>();

            // GetSessions is newest-first; reverse to plot oldest -> newest.
            sessions.Reverse();

            bool hasData = sessions.Count > 0;
            if (emptyLabel != null) emptyLabel.gameObject.SetActive(!hasData);

            var times = new List<float>();
            var romValues = new List<float>();
            var scoreValues = new List<float>();
            for (int i = 0; i < sessions.Count; i++)
            {
                times.Add(i); // session index on X
                romValues.Add(sessions[i].maxRom);
                scoreValues.Add(sessions[i].overallScore);
            }

            if (romGraph != null)
            {
                romGraph.windowSeconds = 0f;
                romGraph.yMin = 0f; romGraph.yMax = 120f;
                romGraph.SetData(times, romValues);
            }
            if (scoreGraph != null)
            {
                scoreGraph.windowSeconds = 0f;
                scoreGraph.yMin = 0f; scoreGraph.yMax = 100f;
                scoreGraph.SetData(times, scoreValues);
            }

            if (romSummaryText != null)
                romSummaryText.text = hasData ? $"Latest ROM: {romValues[romValues.Count - 1]:F0}°" : "–";
            if (scoreSummaryText != null)
                scoreSummaryText.text = hasData ? $"Latest score: {scoreValues[scoreValues.Count - 1]:F0}/100" : "–";
        }
    }
}
