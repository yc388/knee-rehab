#if UNITY_EDITOR
using UnityEditor;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using KneeRehab.UI;
using KneeRehab.ExerciseSystem;
using KneeRehab.Visualization;

namespace KneeRehab.EditorTools
{
    /// <summary>
    /// Screen-by-screen construction used by SceneBuilder. Separated for readability.
    /// Every method returns the panel root and attaches + wires its UI controller.
    /// </summary>
    internal static class SceneBuilderScreens
    {
        private static RectOffset Pad(int l, int t, int r, int b) => new RectOffset(l, r, t, b);

        // ===================================================================
        // Shared header
        // ===================================================================
        private static GameObject Header(GameObject panel, string title, out Button backButton, bool withBack)
        {
            var header = UIFactory.Panel("Header", panel.transform, UIFactory.Primary);
            var hr = UIFactory.Rect(header);
            hr.anchorMin = new Vector2(0, 1); hr.anchorMax = new Vector2(1, 1);
            hr.pivot = new Vector2(0.5f, 1f);
            hr.sizeDelta = new Vector2(0, 92);
            hr.anchoredPosition = Vector2.zero;

            backButton = null;
            if (withBack)
            {
                backButton = UIFactory.Button("Back", header.transform, "←  Back",
                    UIFactory.PrimaryDark, Color.white, 24, out _);
                var brt = UIFactory.Rect(backButton.gameObject);
                brt.anchorMin = new Vector2(0, 0.5f); brt.anchorMax = new Vector2(0, 0.5f);
                brt.pivot = new Vector2(0, 0.5f);
                brt.sizeDelta = new Vector2(150, 56);
                brt.anchoredPosition = new Vector2(18, 0);
            }

            var t = UIFactory.Label("Title", header.transform, title, 34, Color.white,
                TextAlignmentOptions.Center, FontStyles.Bold);
            UIFactory.Stretch(UIFactory.Rect(t));

            if (backButton != null) backButton.transform.SetAsLastSibling();

            var content = UIFactory.Node("Content", panel.transform);
            var crt = UIFactory.Rect(content);
            crt.anchorMin = Vector2.zero; crt.anchorMax = Vector2.one;
            crt.offsetMin = new Vector2(28, 28);
            crt.offsetMax = new Vector2(-28, -108);
            return content;
        }

        // ===================================================================
        // DASHBOARD
        // ===================================================================
        public static GameObject BuildDashboard(Transform parent)
        {
            var panel = SceneBuilder.MakeScreenRoot("Dashboard", parent);
            var content = Header(panel, "Knee Rehabilitation", out _, withBack: false);
            UIFactory.VLayout(content, 16, Pad(24, 20, 24, 20));

            var ui = panel.AddComponent<DashboardUI>();

            ui.welcomeText = UIFactory.Label("Welcome", content.transform,
                "Welcome back", 32, UIFactory.Text, TextAlignmentOptions.Center, FontStyles.Bold);
            UIFactory.Size(ui.welcomeText.gameObject, 44, 48);

            // --- Connection mode row (Demo vs Actual) ---
            var modeCard = UIFactory.RoundedPanel("ModeCard", content.transform, UIFactory.PanelColor);
            UIFactory.Size(modeCard, 150, 160);
            UIFactory.VLayout(modeCard, 10, Pad(20, 16, 20, 16));

            UIFactory.Label("ModeTitle", modeCard.transform, "Connection Mode", 22,
                UIFactory.TextMuted, TextAlignmentOptions.Left, FontStyles.Bold);

            var modeRow = UIFactory.Node("ModeRow", modeCard.transform);
            UIFactory.HLayout(modeRow, 14, Pad(0, 0, 0, 0));
            UIFactory.Size(modeRow, 60, 66);
            ui.demoModeButton = UIFactory.Button("DemoMode", modeRow.transform, "Demo Mode",
                UIFactory.Primary, Color.white, 22, out _);
            ui.actualModeButton = UIFactory.Button("ActualMode", modeRow.transform, "Actual Connection",
                UIFactory.Chip, UIFactory.Text, 22, out _);

            ui.modeHintText = UIFactory.Label("ModeHint", modeCard.transform,
                "Demo Mode — using simulated sensor data.", 18, UIFactory.TextMuted,
                TextAlignmentOptions.Left);

            // --- Connection status + connect button ---
            var connCard = UIFactory.RoundedPanel("ConnectionCard", content.transform, UIFactory.PanelColor);
            UIFactory.Size(connCard, 80, 86);
            UIFactory.HLayout(connCard, 14, Pad(20, 14, 20, 14));

            var dot = UIFactory.RoundedPanel("Dot", connCard.transform, UIFactory.Danger);
            var dotLe = UIFactory.Size(dot, 34, 34, 34);
            dotLe.flexibleWidth = 0; dotLe.preferredWidth = 34;
            ui.statusIndicator = dot.GetComponent<Image>();

            ui.statusText = UIFactory.Label("StatusText", connCard.transform, "Brace Disconnected",
                28, UIFactory.Text, TextAlignmentOptions.Left, FontStyles.Bold);

            var connBtn = UIFactory.Button("ConnectBtn", content.transform, "Connect Knee Brace",
                UIFactory.Primary, Color.white, 26, out var connLabel);
            UIFactory.Size(connBtn.gameObject, 72, 80);
            ui.connectButton = connBtn;
            ui.connectButtonLabel = connLabel;

            // --- Today summary (3 stat blocks) ---
            var statsRow = UIFactory.Node("TodayStats", content.transform);
            UIFactory.HLayout(statsRow, 16, Pad(0, 0, 0, 0));
            UIFactory.Size(statsRow, 110, 118);

            var (_, countVal) = UIFactory.StatBlock("Count", statsRow.transform, "Exercises today", "0", UIFactory.Primary);
            var (_, durVal) = UIFactory.StatBlock("Duration", statsRow.transform, "Time today", "0s", UIFactory.Primary);
            var (_, recentVal) = UIFactory.StatBlock("Recent", statsRow.transform, "Most recent", "–", UIFactory.Good);
            ui.todayCountText = countVal;
            ui.todayDurationText = durVal;
            ui.recentResultText = recentVal;
            recentVal.fontSize = 22;

            // --- Start + nav ---
            var startBtn = UIFactory.Button("StartExercise", content.transform, "Start Exercise",
                UIFactory.Good, Color.white, 30, out _);
            UIFactory.Size(startBtn.gameObject, 76, 84);
            ui.startExerciseButton = startBtn;

            var navRow = UIFactory.Node("NavRow", content.transform);
            UIFactory.HLayout(navRow, 16, Pad(0, 0, 0, 0));
            UIFactory.Size(navRow, 66, 72);
            ui.historyButton = UIFactory.Button("History", navRow.transform, "Exercise History",
                UIFactory.Primary, Color.white, 23, out _);
            ui.progressButton = UIFactory.Button("Progress", navRow.transform, "Progress",
                UIFactory.Primary, Color.white, 23, out _);

            return panel;
        }

        // ===================================================================
        // EXERCISE SELECTION
        // ===================================================================
        public static GameObject BuildSelection(Transform parent, ExerciseCard cardPrefab, ExerciseData[] exercises)
        {
            var panel = SceneBuilder.MakeScreenRoot("ExerciseSelection", parent);
            var content = Header(panel, "Choose an Exercise", out var back, withBack: true);

            var ui = panel.AddComponent<ExerciseSelectionUI>();
            ui.backButton = back;
            ui.cardPrefab = cardPrefab;
            ui.exercises = exercises;

            var scroll = MakeScroll(content.transform, out var viewportContent);
            var grid = viewportContent.AddComponent<GridLayoutGroup>();
            grid.cellSize = new Vector2(560, 250);
            grid.spacing = new Vector2(20, 20);
            grid.padding = Pad(10, 10, 10, 10);
            grid.constraint = GridLayoutGroup.Constraint.FixedColumnCount;
            grid.constraintCount = 2;
            viewportContent.AddComponent<ContentSizeFitter>().verticalFit = ContentSizeFitter.FitMode.PreferredSize;

            ui.cardContainer = viewportContent.transform;
            return panel;
        }

        // ===================================================================
        // INSTRUCTION (with angle pickers)
        // ===================================================================
        public static GameObject BuildInstruction(Transform parent, Button anglePrefab)
        {
            var panel = SceneBuilder.MakeScreenRoot("ExerciseInstruction", parent);
            var content = Header(panel, "Exercise Instructions", out var back, withBack: true);
            UIFactory.VLayout(content, 12, Pad(24, 18, 24, 18));

            var ui = panel.AddComponent<ExerciseInstructionUI>();
            ui.backButton = back;
            ui.anglePresetButtonPrefab = anglePrefab;

            ui.nameText = UIFactory.Label("Name", content.transform, "Exercise", 32,
                UIFactory.Text, TextAlignmentOptions.Center, FontStyles.Bold);
            UIFactory.Size(ui.nameText.gameObject, 42, 46);

            var card = UIFactory.RoundedPanel("InstrCard", content.transform, UIFactory.PanelColor);
            UIFactory.Size(card, 170, 210);
            UIFactory.VLayout(card, 8, Pad(22, 16, 22, 16));
            ui.instructionsText = UIFactory.Label("Instructions", card.transform, "", 23, UIFactory.Text);
            UIFactory.Size(ui.instructionsText.gameObject, 140, 170);

            ui.repsText = UIFactory.Label("Reps", content.transform, "", 21, UIFactory.TextMuted, TextAlignmentOptions.Center);
            ui.romText = UIFactory.Label("Rom", content.transform, "", 21, UIFactory.TextMuted, TextAlignmentOptions.Center);
            ui.durationText = UIFactory.Label("Duration", content.transform, "", 21, UIFactory.TextMuted, TextAlignmentOptions.Center);
            ui.safetyText = UIFactory.Label("Safety", content.transform, "", 19, UIFactory.Warn, TextAlignmentOptions.Center);
            UIFactory.Size(ui.safetyText.gameObject, 40, 54);

            // --- Angle pickers (Start + Target) ---
            var pickCard = UIFactory.RoundedPanel("AngleCard", content.transform, UIFactory.PanelColor);
            UIFactory.Size(pickCard, 160, 176);
            UIFactory.VLayout(pickCard, 6, Pad(20, 14, 20, 14));

            ui.angleSummaryText = UIFactory.Label("AngleSummary", pickCard.transform,
                "Start 90°   •   Target 15°", 22, UIFactory.Text, TextAlignmentOptions.Center, FontStyles.Bold);

            UIFactory.Label("StartLbl", pickCard.transform, "Starting angle", 17, UIFactory.TextMuted, TextAlignmentOptions.Left);
            ui.startPickerContainer = MakePickerRow(pickCard.transform, "StartRow").transform;
            UIFactory.Label("TargetLbl", pickCard.transform, "Target angle", 17, UIFactory.TextMuted, TextAlignmentOptions.Left);
            ui.targetPickerContainer = MakePickerRow(pickCard.transform, "TargetRow").transform;

            var btnRow = UIFactory.Node("Buttons", content.transform);
            UIFactory.HLayout(btnRow, 16, Pad(0, 0, 0, 0));
            UIFactory.Size(btnRow, 76, 84);
            ui.startButton = UIFactory.Button("Start", btnRow.transform, "Start Exercise",
                UIFactory.Good, Color.white, 28, out _);

            // Countdown overlay
            var overlay = UIFactory.Panel("CountdownOverlay", panel.transform, new Color(0, 0, 0, 0.78f));
            UIFactory.Stretch(UIFactory.Rect(overlay));
            ui.countdownOverlay = overlay;
            ui.countdownLabel = UIFactory.Label("CountdownLabel", overlay.transform, "3", 170,
                Color.white, TextAlignmentOptions.Center, FontStyles.Bold);
            UIFactory.Stretch(UIFactory.Rect(ui.countdownLabel));
            overlay.SetActive(false);

            return panel;
        }

        // A horizontal row to hold angle-preset chips.
        private static GameObject MakePickerRow(Transform parent, string name)
        {
            var row = UIFactory.Node(name, parent);
            var h = UIFactory.HLayout(row, 6, Pad(0, 0, 0, 0));
            h.childForceExpandWidth = true;
            UIFactory.Size(row, 48, 52);
            return row;
        }

        // ===================================================================
        // LIVE EXERCISE  (most important screen)
        // ===================================================================
        public static GameObject BuildLive(Transform parent, ResultsUI results, RenderTexture legRt, Button anglePrefab)
        {
            var panel = SceneBuilder.MakeScreenRoot("LiveExercise", parent);
            var ui = panel.AddComponent<LiveExerciseUI>();
            ui.resultsUI = results;
            ui.anglePresetButtonPrefab = anglePrefab;

            // Top bar: exercise name + timer + stop
            var top = UIFactory.Panel("TopBar", panel.transform, UIFactory.Primary);
            var trt = UIFactory.Rect(top);
            trt.anchorMin = new Vector2(0, 1); trt.anchorMax = new Vector2(1, 1);
            trt.pivot = new Vector2(0.5f, 1f); trt.sizeDelta = new Vector2(0, 82);

            ui.exerciseNameText = UIFactory.Label("ExName", top.transform, "Seated Knee Extension",
                28, Color.white, TextAlignmentOptions.Left, FontStyles.Bold);
            var exr = UIFactory.Rect(ui.exerciseNameText.gameObject);
            exr.anchorMin = new Vector2(0, 0); exr.anchorMax = new Vector2(0.55f, 1);
            exr.offsetMin = new Vector2(24, 0); exr.offsetMax = Vector2.zero;

            ui.timerText = UIFactory.Label("Timer", top.transform, "00:00", 34, Color.white,
                TextAlignmentOptions.Center, FontStyles.Bold);
            var tmr = UIFactory.Rect(ui.timerText.gameObject);
            tmr.anchorMin = new Vector2(0.55f, 0); tmr.anchorMax = new Vector2(0.78f, 1);
            tmr.offsetMin = Vector2.zero; tmr.offsetMax = Vector2.zero;

            ui.stopButton = UIFactory.Button("StopBtn", top.transform, "Stop", UIFactory.Danger, Color.white, 24, out _);
            var sbr = UIFactory.Rect(ui.stopButton.gameObject);
            sbr.anchorMin = new Vector2(0.80f, 0.5f); sbr.anchorMax = new Vector2(1f, 0.5f);
            sbr.pivot = new Vector2(1f, 0.5f); sbr.sizeDelta = new Vector2(0, 54);
            sbr.offsetMin = new Vector2(0, -27); sbr.offsetMax = new Vector2(-18, 27);

            // LEFT column: reps, gauge, big angle, feedback, secondary stats, pickers
            var left = UIFactory.RoundedPanel("LeftColumn", panel.transform, Color.white);
            var lrt = UIFactory.Rect(left);
            lrt.anchorMin = new Vector2(0, 0); lrt.anchorMax = new Vector2(0.50f, 1);
            lrt.offsetMin = new Vector2(16, 16); lrt.offsetMax = new Vector2(-8, -90);
            UIFactory.VLayout(left, 10, Pad(22, 18, 22, 18));

            var repsRow = UIFactory.Node("RepsRow", left.transform);
            UIFactory.HLayout(repsRow, 12, Pad(0, 0, 0, 0));
            UIFactory.Size(repsRow, 56, 62);
            ui.repCounterText = UIFactory.Label("Reps", repsRow.transform, "0 / 10 Reps", 44,
                UIFactory.Primary, TextAlignmentOptions.Center, FontStyles.Bold);
            ui.goodRepText = UIFactory.Label("Good", repsRow.transform, "0 good", 26,
                UIFactory.Good, TextAlignmentOptions.Center, FontStyles.Bold);

            // Gauge + big angle overlay
            var gaugeGo = UIFactory.Node("Gauge", left.transform);
            UIFactory.Size(gaugeGo, 220, 240);
            var gaugeBgImg = gaugeGo.AddComponent<Image>();
            gaugeBgImg.color = new Color(0.90f, 0.94f, 0.96f);
            gaugeBgImg.sprite = BuiltinKnob();
            gaugeBgImg.type = Image.Type.Filled;
            gaugeBgImg.fillMethod = Image.FillMethod.Radial360;
            gaugeBgImg.fillAmount = 1f;
            gaugeBgImg.raycastTarget = false;

            var fillGo = UIFactory.Node("Fill", gaugeGo.transform);
            UIFactory.Stretch(UIFactory.Rect(fillGo), 10);
            var fillImg = fillGo.AddComponent<Image>();
            fillImg.color = UIFactory.Primary;
            fillImg.sprite = BuiltinKnob();
            fillImg.type = Image.Type.Filled;
            fillImg.fillMethod = Image.FillMethod.Radial360;
            fillImg.fillAmount = 0.5f;
            fillImg.raycastTarget = false;

            ui.angleText = UIFactory.Label("Angle", gaugeGo.transform, "90°", 70,
                UIFactory.Text, TextAlignmentOptions.Center, FontStyles.Bold);
            UIFactory.Stretch(UIFactory.Rect(ui.angleText.gameObject));

            var gauge = gaugeGo.AddComponent<AngleGauge>();
            gauge.fillImage = fillImg;
            gauge.minAngle = 0; gauge.maxAngle = 120;
            ui.gauge = gauge;

            ui.feedbackText = UIFactory.Label("Feedback", left.transform, "Get ready", 30,
                UIFactory.Good, TextAlignmentOptions.Center, FontStyles.Bold);
            UIFactory.Size(ui.feedbackText.gameObject, 60, 70);

            var secRow = UIFactory.Node("Secondary", left.transform);
            UIFactory.HLayout(secRow, 16, Pad(0, 0, 0, 0));
            UIFactory.Size(secRow, 44, 50);
            ui.romText = UIFactory.Label("Rom", secRow.transform, "ROM: 0°", 24, UIFactory.TextMuted, TextAlignmentOptions.Center);
            ui.speedText = UIFactory.Label("Speed", secRow.transform, "0°/second", 24, UIFactory.TextMuted, TextAlignmentOptions.Center);

            // Live angle pickers
            ui.targetReadoutText = UIFactory.Label("TargetReadout", left.transform,
                "Start 90°   •   Target 15°", 20, UIFactory.Text, TextAlignmentOptions.Center, FontStyles.Bold);
            UIFactory.Label("StartLbl", left.transform, "Start angle", 15, UIFactory.TextMuted, TextAlignmentOptions.Center);
            ui.startPickerContainer = MakePickerRow(left.transform, "StartRow").transform;
            UIFactory.Label("TargetLbl", left.transform, "Target angle", 15, UIFactory.TextMuted, TextAlignmentOptions.Center);
            ui.targetPickerContainer = MakePickerRow(left.transform, "TargetRow").transform;

            // RIGHT column: 3D leg (top) + live graph (bottom)
            var right = UIFactory.Node("RightColumn", panel.transform);
            var rrt = UIFactory.Rect(right);
            rrt.anchorMin = new Vector2(0.50f, 0); rrt.anchorMax = new Vector2(1, 1);
            rrt.offsetMin = new Vector2(8, 16); rrt.offsetMax = new Vector2(-16, -90);

            // 3D leg render (top ~55%)
            var legCard = UIFactory.RoundedPanel("LegCard", right.transform, Color.white);
            var legRt_ = UIFactory.Rect(legCard);
            legRt_.anchorMin = new Vector2(0, 0.46f); legRt_.anchorMax = new Vector2(1, 1);
            legRt_.offsetMin = Vector2.zero; legRt_.offsetMax = Vector2.zero;
            UIFactory.Label("LegTitle", legCard.transform, "Live Knee Movement", 20, UIFactory.TextMuted, TextAlignmentOptions.TopLeft);
            var legImgGo = UIFactory.Node("LegImage", legCard.transform);
            UIFactory.Stretch(UIFactory.Rect(legImgGo), 16);
            var raw = legImgGo.AddComponent<RawImage>();
            raw.texture = legRt;
            raw.raycastTarget = false;

            // Live graph (bottom ~42%)
            var graphCard = UIFactory.RoundedPanel("GraphCard", right.transform, Color.white);
            var grt = UIFactory.Rect(graphCard);
            grt.anchorMin = new Vector2(0, 0); grt.anchorMax = new Vector2(1, 0.42f);
            grt.offsetMin = Vector2.zero; grt.offsetMax = Vector2.zero;
            UIFactory.Label("GraphTitle", graphCard.transform, "Knee Angle (°) over Time", 20,
                UIFactory.TextMuted, TextAlignmentOptions.TopLeft);
            var graphGo = UIFactory.Node("LiveGraph", graphCard.transform);
            UIFactory.Stretch(UIFactory.Rect(graphGo), 16);
            var graph = graphGo.AddComponent<UILineGraph>();
            graph.yMin = 0; graph.yMax = 120; graph.windowSeconds = 12f;
            var graphCtrl = graphGo.AddComponent<LiveGraphController>();
            graphCtrl.graph = graph;

            return panel;
        }

        // ===================================================================
        // RESULTS
        // ===================================================================
        public static GameObject BuildResults(Transform parent)
        {
            var panel = SceneBuilder.MakeScreenRoot("ExerciseResults", parent);
            var content = Header(panel, "Performance Results", out _, withBack: false);
            UIFactory.VLayout(content, 12, Pad(20, 16, 20, 16));

            var ui = panel.AddComponent<ResultsUI>();

            ui.exerciseNameText = UIFactory.Label("ExName", content.transform, "Exercise", 30,
                UIFactory.Text, TextAlignmentOptions.Center, FontStyles.Bold);
            UIFactory.Size(ui.exerciseNameText.gameObject, 40, 44);

            var statsGrid = UIFactory.Node("Stats", content.transform);
            var grid = statsGrid.AddComponent<GridLayoutGroup>();
            grid.cellSize = new Vector2(224, 86);
            grid.spacing = new Vector2(12, 12);
            grid.constraint = GridLayoutGroup.Constraint.FixedColumnCount;
            grid.constraintCount = 5;
            UIFactory.Size(statsGrid, 190, 190);

            ui.repsText = StatInGrid(statsGrid.transform, "Repetitions");
            ui.maxFlexionText = StatInGrid(statsGrid.transform, "Max Flexion");
            ui.maxExtensionText = StatInGrid(statsGrid.transform, "Max Extension");
            ui.maxRomText = StatInGrid(statsGrid.transform, "Max ROM");
            ui.avgRomText = StatInGrid(statsGrid.transform, "Average ROM");
            ui.avgSpeedText = StatInGrid(statsGrid.transform, "Avg Speed");
            ui.durationText = StatInGrid(statsGrid.transform, "Duration");
            ui.consistencyText = StatInGrid(statsGrid.transform, "Consistency");
            ui.overallScoreText = StatInGrid(statsGrid.transform, "Overall Score");

            var graphCard = UIFactory.RoundedPanel("GraphCard", content.transform, UIFactory.PanelColor);
            UIFactory.Size(graphCard, 170, 190);
            var graphGo = UIFactory.Node("ResultsGraph", graphCard.transform);
            UIFactory.Stretch(UIFactory.Rect(graphGo), 16);
            var graph = graphGo.AddComponent<UILineGraph>();
            graph.yMin = 0; graph.yMax = 120; graph.windowSeconds = 0f;
            ui.graph = graph;

            ui.performanceMessageText = UIFactory.Label("PerfMsg", content.transform, "", 23,
                UIFactory.Text, TextAlignmentOptions.Center);
            UIFactory.Size(ui.performanceMessageText.gameObject, 54, 70);
            ui.improvementText = UIFactory.Label("Improve", content.transform, "", 21,
                UIFactory.Primary, TextAlignmentOptions.Center);

            var btnRow = UIFactory.Node("Buttons", content.transform);
            UIFactory.HLayout(btnRow, 16, Pad(0, 0, 0, 0));
            UIFactory.Size(btnRow, 72, 80);
            ui.repeatButton = UIFactory.Button("Repeat", btnRow.transform, "Repeat Exercise",
                UIFactory.Good, Color.white, 23, out _);
            ui.chooseAnotherButton = UIFactory.Button("Choose", btnRow.transform, "Choose Another",
                UIFactory.Primary, Color.white, 23, out _);
            ui.dashboardButton = UIFactory.Button("Dash", btnRow.transform, "Dashboard",
                UIFactory.PrimaryDark, Color.white, 23, out _);

            return panel;
        }

        private static TextMeshProUGUI StatInGrid(Transform parent, string caption)
        {
            var (_, val) = UIFactory.StatBlock(caption, parent, caption, "–", UIFactory.Primary);
            val.fontSize = 30;
            return val;
        }

        // ===================================================================
        // HISTORY
        // ===================================================================
        public static GameObject BuildHistory(Transform parent, HistoryRow rowPrefab, ResultsUI results)
        {
            var panel = SceneBuilder.MakeScreenRoot("ExerciseHistory", parent);
            var content = Header(panel, "Exercise History", out var back, withBack: true);

            var ui = panel.AddComponent<ExerciseHistoryUI>();
            ui.backButton = back;
            ui.rowPrefab = rowPrefab;
            ui.resultsUI = results;

            var scroll = MakeScroll(content.transform, out var listContent);
            var v = listContent.AddComponent<VerticalLayoutGroup>();
            v.spacing = 10; v.padding = Pad(10, 10, 10, 10);
            v.childControlWidth = true; v.childControlHeight = false;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
            listContent.AddComponent<ContentSizeFitter>().verticalFit = ContentSizeFitter.FitMode.PreferredSize;
            ui.rowContainer = listContent.transform;

            ui.emptyLabel = UIFactory.Label("Empty", content.transform, "No sessions yet", 26,
                UIFactory.TextMuted, TextAlignmentOptions.Center);
            var ert = UIFactory.Rect(ui.emptyLabel.gameObject);
            ert.anchorMin = new Vector2(0.5f, 0.5f); ert.anchorMax = new Vector2(0.5f, 0.5f);
            ert.sizeDelta = new Vector2(400, 60);

            return panel;
        }

        // ===================================================================
        // PROGRESS
        // ===================================================================
        public static GameObject BuildProgress(Transform parent)
        {
            var panel = SceneBuilder.MakeScreenRoot("Progress", parent);
            var content = Header(panel, "Rehabilitation Progress", out var back, withBack: true);
            UIFactory.VLayout(content, 16, Pad(24, 20, 24, 20));

            var ui = panel.AddComponent<ProgressUI>();
            ui.backButton = back;

            ui.romSummaryText = UIFactory.Label("RomSummary", content.transform, "Best ROM over time", 24,
                UIFactory.Text, TextAlignmentOptions.Center, FontStyles.Bold);
            var romCard = UIFactory.RoundedPanel("RomCard", content.transform, UIFactory.PanelColor);
            UIFactory.Size(romCard, 160, 200);
            var romGo = UIFactory.Node("RomGraph", romCard.transform);
            UIFactory.Stretch(UIFactory.Rect(romGo), 16);
            ui.romGraph = romGo.AddComponent<UILineGraph>();
            ui.romGraph.yMin = 0; ui.romGraph.yMax = 120; ui.romGraph.windowSeconds = 0f;
            ui.romGraph.lineColor = UIFactory.Good;

            ui.scoreSummaryText = UIFactory.Label("ScoreSummary", content.transform, "Score over time", 24,
                UIFactory.Text, TextAlignmentOptions.Center, FontStyles.Bold);
            var scoreCard = UIFactory.RoundedPanel("ScoreCard", content.transform, UIFactory.PanelColor);
            UIFactory.Size(scoreCard, 160, 200);
            var scoreGo = UIFactory.Node("ScoreGraph", scoreCard.transform);
            UIFactory.Stretch(UIFactory.Rect(scoreGo), 16);
            ui.scoreGraph = scoreGo.AddComponent<UILineGraph>();
            ui.scoreGraph.yMin = 0; ui.scoreGraph.yMax = 100; ui.scoreGraph.windowSeconds = 0f;

            ui.emptyLabel = UIFactory.Label("Empty", content.transform,
                "Complete a few sessions to see progress", 22, UIFactory.TextMuted, TextAlignmentOptions.Center);

            return panel;
        }

        // ===================================================================
        // PREFABS
        // ===================================================================
        public static ExerciseCard BuildExerciseCardPrefab()
        {
            var go = UIFactory.RoundedPanel("ExerciseCard", null, UIFactory.PanelColor);
            var card = go.AddComponent<ExerciseCard>();
            UIFactory.VLayout(go, 8, Pad(22, 18, 22, 18));

            card.nameText = UIFactory.Label("Name", go.transform, "Exercise Name", 28,
                UIFactory.Text, TextAlignmentOptions.Left, FontStyles.Bold);
            UIFactory.Size(card.nameText.gameObject, 36, 40);
            card.descriptionText = UIFactory.Label("Desc", go.transform, "Description", 20, UIFactory.TextMuted);
            UIFactory.Size(card.descriptionText.gameObject, 48, 64);

            var meta = UIFactory.Node("Meta", go.transform);
            UIFactory.HLayout(meta, 12, Pad(0, 0, 0, 0));
            UIFactory.Size(meta, 28, 32);
            card.repsText = UIFactory.Label("Reps", meta.transform, "10 reps", 18, UIFactory.Primary, TextAlignmentOptions.Center);
            card.durationText = UIFactory.Label("Dur", meta.transform, "~1m", 18, UIFactory.Primary, TextAlignmentOptions.Center);
            card.difficultyText = UIFactory.Label("Diff", meta.transform, "Easy", 18, UIFactory.Good, TextAlignmentOptions.Center);

            card.startButton = UIFactory.Button("Start", go.transform, "Start Exercise",
                UIFactory.Good, Color.white, 23, out _);

            var prefab = SaveAsPrefab(go, "Assets/Prefabs/ExerciseCard.prefab");
            Object.DestroyImmediate(go);
            return prefab.GetComponent<ExerciseCard>();
        }

        public static HistoryRow BuildHistoryRowPrefab()
        {
            var go = UIFactory.RoundedPanel("HistoryRow", null, UIFactory.PanelColor);
            var row = go.AddComponent<HistoryRow>();
            var btn = go.AddComponent<Button>();
            btn.targetGraphic = go.GetComponent<Image>();
            row.button = btn;
            UIFactory.Size(go, 84, 90);
            UIFactory.HLayout(go, 12, Pad(18, 10, 18, 10));

            var col = UIFactory.Node("Info", go.transform);
            UIFactory.VLayout(col, 2, Pad(0, 0, 0, 0), TextAnchor.MiddleLeft);
            row.exerciseText = UIFactory.Label("Ex", col.transform, "Exercise", 24, UIFactory.Text, TextAlignmentOptions.Left, FontStyles.Bold);
            row.summaryText = UIFactory.Label("Sum", col.transform, "summary", 18, UIFactory.TextMuted, TextAlignmentOptions.Left);
            row.dateText = UIFactory.Label("Date", col.transform, "date", 16, UIFactory.TextMuted, TextAlignmentOptions.Left);

            row.scoreText = UIFactory.Label("Score", go.transform, "0", 40, UIFactory.Primary, TextAlignmentOptions.Center, FontStyles.Bold);
            UIFactory.Size(row.scoreText.gameObject, 60, 60, 80);

            var prefab = SaveAsPrefab(go, "Assets/Prefabs/HistoryRow.prefab");
            Object.DestroyImmediate(go);
            return prefab.GetComponent<HistoryRow>();
        }

        // A small reusable angle-preset chip button.
        public static Button BuildAnglePresetButtonPrefab()
        {
            var btn = UIFactory.Button("AngleChip", null, "0°", UIFactory.Chip, UIFactory.Text, 20, out _);
            var le = btn.GetComponent<LayoutElement>();
            le.minHeight = 44; le.preferredHeight = 44; le.minWidth = 54;
            var prefab = SaveAsPrefab(btn.gameObject, "Assets/Prefabs/AngleChip.prefab");
            Object.DestroyImmediate(btn.gameObject);
            return prefab.GetComponent<Button>();
        }

        // ===================================================================
        // Shared helpers
        // ===================================================================
        private static ScrollRect MakeScroll(Transform parent, out GameObject content)
        {
            var scrollGo = UIFactory.Node("Scroll", parent);
            UIFactory.Stretch(UIFactory.Rect(scrollGo));
            var scroll = scrollGo.AddComponent<ScrollRect>();
            scroll.horizontal = false;

            var viewport = UIFactory.Panel("Viewport", scrollGo.transform, new Color(1, 1, 1, 0.01f));
            UIFactory.Stretch(UIFactory.Rect(viewport));
            viewport.AddComponent<Mask>().showMaskGraphic = false;
            scroll.viewport = UIFactory.Rect(viewport);

            content = UIFactory.Node("Content", viewport.transform);
            var crt = UIFactory.Rect(content);
            crt.anchorMin = new Vector2(0, 1); crt.anchorMax = new Vector2(1, 1);
            crt.pivot = new Vector2(0.5f, 1f);
            crt.anchoredPosition = Vector2.zero;
            crt.sizeDelta = new Vector2(0, 100);
            scroll.content = crt;
            return scroll;
        }

        private static GameObject SaveAsPrefab(GameObject go, string path)
        {
            System.IO.Directory.CreateDirectory("Assets/Prefabs");
            return PrefabUtility.SaveAsPrefabAsset(go, path);
        }

        private static Sprite _knob;
        private static Sprite BuiltinKnob()
        {
            if (_knob != null) return _knob;
            _knob = AssetDatabase.GetBuiltinExtraResource<Sprite>("UI/Skin/Knob.psd");
            if (_knob == null)
            {
                var tex = Texture2D.whiteTexture;
                _knob = Sprite.Create(tex, new Rect(0, 0, tex.width, tex.height), new Vector2(0.5f, 0.5f));
            }
            return _knob;
        }
    }
}
#endif
