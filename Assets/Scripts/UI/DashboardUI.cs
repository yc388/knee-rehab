using UnityEngine;
using UnityEngine.UI;
using TMPro;
using KneeRehab.Core;
using KneeRehab.Sensors;
using KneeRehab.Data;

namespace KneeRehab.UI
{
    /// <summary>
    /// Controls the Main Dashboard screen: welcome text, brace connection status +
    /// "Connect" button with a simulated "Connecting..." phase, today's summary,
    /// most-recent result, and navigation to Start Exercise / History.
    ///
    /// ATTACH TO: the Dashboard panel root.
    /// INSPECTOR: assign all the TMP_Text / Button / Image references below.
    /// Wiring to other scripts is via singletons (SensorService, ScreenManager,
    /// ExerciseHistoryManager) resolved at runtime — no Inspector links needed.
    /// </summary>
    public class DashboardUI : MonoBehaviour
    {
        [Header("Header")]
        public TMP_Text welcomeText;

        [Header("Connection")]
        public TMP_Text statusText;
        public Image statusIndicator;        // color dot
        public Button connectButton;
        public TMP_Text connectButtonLabel;

        [Header("Connection mode")]
        public Button demoModeButton;        // use the simulator
        public Button actualModeButton;      // use the real brace (network provider)
        public TMP_Text modeHintText;        // explains the current mode
        public Color modeSelectedColor = new Color(0.16f, 0.55f, 0.72f);
        public Color modeUnselectedColor = new Color(0.80f, 0.85f, 0.90f);

        [Header("Today summary")]
        public TMP_Text todayCountText;
        public TMP_Text todayDurationText;
        public TMP_Text recentResultText;

        [Header("Navigation")]
        public Button startExerciseButton;
        public Button historyButton;
        public Button progressButton;

        [Header("Status colors")]
        public Color disconnectedColor = new Color(0.85f, 0.33f, 0.31f);
        public Color connectingColor = new Color(0.95f, 0.70f, 0.20f);
        public Color connectedColor = new Color(0.30f, 0.69f, 0.49f);

        private void OnEnable()
        {
            var svc = SensorService.Instance;
            if (svc != null)
            {
                svc.ConnectionChanged += OnConnectionChanged;
                svc.ConnectingStarted += OnConnectingStarted;
            }
            if (ExerciseHistoryManager.Instance != null)
                ExerciseHistoryManager.Instance.HistoryChanged += RefreshSummary;

            RefreshAll();
        }

        private void OnDisable()
        {
            var svc = SensorService.Instance;
            if (svc != null)
            {
                svc.ConnectionChanged -= OnConnectionChanged;
                svc.ConnectingStarted -= OnConnectingStarted;
            }
            if (ExerciseHistoryManager.Instance != null)
                ExerciseHistoryManager.Instance.HistoryChanged -= RefreshSummary;
        }

        private void Start()
        {
            if (connectButton != null) connectButton.onClick.AddListener(OnConnectClicked);
            if (demoModeButton != null) demoModeButton.onClick.AddListener(() => SetMode(SensorSourceMode.Simulated));
            if (actualModeButton != null) actualModeButton.onClick.AddListener(() => SetMode(SensorSourceMode.Network));
            if (startExerciseButton != null)
                startExerciseButton.onClick.AddListener(() => ScreenManager.Instance.Show(AppScreen.ExerciseSelection));
            if (historyButton != null)
                historyButton.onClick.AddListener(() => ScreenManager.Instance.Show(AppScreen.ExerciseHistory));
            if (progressButton != null)
                progressButton.onClick.AddListener(() => ScreenManager.Instance.Show(AppScreen.Progress));

            if (welcomeText != null) welcomeText.text = "Welcome back";
            RefreshAll();
        }

        private void OnConnectClicked()
        {
            var svc = SensorService.Instance;
            if (svc == null) return;
            if (svc.IsConnected) svc.DisconnectBrace();
            else svc.BeginConnect();
            RefreshConnection();
        }

        private void OnConnectingStarted() => RefreshConnection();
        private void OnConnectionChanged(bool connected) => RefreshConnection();

        private void SetMode(SensorSourceMode mode)
        {
            var svc = SensorService.Instance;
            if (svc == null) return;
            svc.SetMode(mode);
            RefreshMode();
            RefreshConnection();
        }

        private void RefreshMode()
        {
            var svc = SensorService.Instance;
            if (svc == null) return;

            bool demo = svc.Mode == SensorSourceMode.Simulated;
            TintModeButton(demoModeButton, demo);
            TintModeButton(actualModeButton, !demo);

            if (modeHintText != null)
            {
                modeHintText.text = demo
                    ? "Demo Mode — using simulated sensor data."
                    : "Actual Connection — streaming from the knee brace (Raspberry Pi / 5G).";
            }
        }

        private void TintModeButton(Button btn, bool selected)
        {
            if (btn == null) return;
            var img = btn.GetComponent<Image>();
            if (img != null) img.color = selected ? modeSelectedColor : modeUnselectedColor;
            var label = btn.GetComponentInChildren<TMP_Text>();
            if (label != null) label.color = selected ? Color.white : new Color(0.25f, 0.3f, 0.35f);
        }

        private void RefreshAll()
        {
            RefreshMode();
            RefreshConnection();
            RefreshSummary();
        }

        private void RefreshConnection()
        {
            var svc = SensorService.Instance;
            if (svc == null) return;

            // Gate "Start Exercise" on being connected.
            if (startExerciseButton != null) startExerciseButton.interactable = svc.IsConnected;

            if (svc.IsConnecting)
            {
                SetStatus("Connecting to Knee Brace...", connectingColor);
                if (connectButtonLabel != null) connectButtonLabel.text = "Connecting...";
                if (connectButton != null) connectButton.interactable = false;
            }
            else if (svc.IsConnected)
            {
                SetStatus("Brace Connected", connectedColor);
                if (connectButtonLabel != null) connectButtonLabel.text = "Disconnect";
                if (connectButton != null) connectButton.interactable = true;
            }
            else
            {
                SetStatus("Brace Disconnected", disconnectedColor);
                if (connectButtonLabel != null) connectButtonLabel.text = "Connect Knee Brace";
                if (connectButton != null) connectButton.interactable = true;
            }
        }

        private void SetStatus(string text, Color color)
        {
            if (statusText != null)
            {
                statusText.text = text;
                statusText.color = color;
            }
            if (statusIndicator != null) statusIndicator.color = color;
        }

        private void Update()
        {
            // The simulated-connecting phase resolves on a timer inside SensorService;
            // poll once per frame while connecting so the label flips promptly.
            var svc = SensorService.Instance;
            if (svc != null && svc.IsConnecting) RefreshConnection();
        }

        private void RefreshSummary()
        {
            var hist = ExerciseHistoryManager.Instance;
            if (hist == null) return;

            var (count, seconds) = hist.TodaySummary();
            if (todayCountText != null) todayCountText.text = count.ToString();
            if (todayDurationText != null)
            {
                int m = (int)(seconds / 60f);
                int s = (int)(seconds % 60f);
                todayDurationText.text = m > 0 ? $"{m}m {s}s" : $"{s}s";
            }

            var recent = hist.MostRecent();
            if (recentResultText != null)
            {
                recentResultText.text = recent == null
                    ? "No sessions yet"
                    : $"{recent.exerciseName} — {recent.overallScore}/100";
            }
        }
    }
}
