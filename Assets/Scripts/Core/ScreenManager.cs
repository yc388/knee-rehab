using System;
using System.Collections.Generic;
using UnityEngine;

namespace KneeRehab.Core
{
    /// <summary>
    /// The screens of the app. We use one scene with multiple Canvas panels rather
    /// than multiple Unity scenes: no load flicker, shared singletons stay alive,
    /// and navigation is instant — ideal for a rehab patient flow.
    /// </summary>
    public enum AppScreen
    {
        Dashboard,
        ExerciseSelection,
        ExerciseInstruction,
        LiveExercise,
        ExerciseResults,
        ExerciseHistory,
        Progress
    }

    /// <summary>
    /// Shows exactly one screen panel at a time. Each screen is a root GameObject
    /// (a full-screen panel) registered here. Other scripts call
    /// ScreenManager.Instance.Show(AppScreen.X) to navigate.
    ///
    /// ATTACH TO: a GameObject named "ScreenManager" under the main Canvas.
    /// INSPECTOR: assign each panel GameObject to the matching slot below.
    /// (The SceneBuilder editor tool creates the panels and assigns them.)
    /// </summary>
    public class ScreenManager : MonoBehaviour
    {
        public static ScreenManager Instance { get; private set; }

        [Header("Screen panels (root GameObject of each screen)")]
        public GameObject dashboardPanel;
        public GameObject exerciseSelectionPanel;
        public GameObject exerciseInstructionPanel;
        public GameObject liveExercisePanel;
        public GameObject exerciseResultsPanel;
        public GameObject exerciseHistoryPanel;
        public GameObject progressPanel;

        [Header("Start-up")]
        public AppScreen startScreen = AppScreen.Dashboard;

        /// <summary>Fires after a screen becomes visible. Useful for refresh-on-show.</summary>
        public event Action<AppScreen> ScreenShown;

        private Dictionary<AppScreen, GameObject> _panels;

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;

            _panels = new Dictionary<AppScreen, GameObject>
            {
                { AppScreen.Dashboard, dashboardPanel },
                { AppScreen.ExerciseSelection, exerciseSelectionPanel },
                { AppScreen.ExerciseInstruction, exerciseInstructionPanel },
                { AppScreen.LiveExercise, liveExercisePanel },
                { AppScreen.ExerciseResults, exerciseResultsPanel },
                { AppScreen.ExerciseHistory, exerciseHistoryPanel },
                { AppScreen.Progress, progressPanel },
            };
        }

        private void Start()
        {
            Show(startScreen);
        }

        public void Show(AppScreen screen)
        {
            foreach (var kv in _panels)
            {
                if (kv.Value != null)
                    kv.Value.SetActive(kv.Key == screen);
            }
            ScreenShown?.Invoke(screen);
        }

        // Convenience hooks for Button OnClick() wiring in the Inspector.
        public void ShowDashboard() => Show(AppScreen.Dashboard);
        public void ShowExerciseSelection() => Show(AppScreen.ExerciseSelection);
        public void ShowInstruction() => Show(AppScreen.ExerciseInstruction);
        public void ShowLiveExercise() => Show(AppScreen.LiveExercise);
        public void ShowResults() => Show(AppScreen.ExerciseResults);
        public void ShowHistory() => Show(AppScreen.ExerciseHistory);
        public void ShowProgress() => Show(AppScreen.Progress);
    }
}
