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

        // Header with a title and an optional back button; returns the content area
        // below the header for the caller to fill.
        private static GameObject Header(GameObject panel, string title, out Button backButton, bool withBack)
        {
            var header = UIFactory.Panel("Header", panel.transform, UIFactory.Primary);
            var hr = UIFactory.Rect(header);
            hr.anchorMin = new Vector2(0, 1); hr.anchorMax = new Vector2(1, 1);
            hr.pivot = new Vector2(0.5f, 1f);
            hr.sizeDelta = new Vector2(0, 90);
            hr.anchoredPosition = Vector2.zero;

            backButton = null;
            if (withBack)
            {
                backButton = UIFactory.Button("Back", header.transform, "← Back",
                    UIFactory.PrimaryDark, Color.white, 24, out _);
                var brt = UIFactory.Rect(backButton.gameObject);
                brt.anchorMin = new Vector2(0, 0.5f); brt.anchorMax = new Vector2(0, 0.5f);
                brt.pivot = new Vector2(0, 0.5f);
                brt.sizeDelta = new Vector2(150, 60);
                brt.anchoredPosition = new Vector2(16, 0);
            }

            var t = UIFactory.Label("Title", header.transform, title, 34, Color.white,
                TextAlignmentOptions.Center, FontStyles.Bold);
            UIFactory.Stretch(UIFactory.Rect(t));

            var content = UIFactory.Node("Content", panel.transform);
            var crt = UIFactory.Rect(content);
            crt.anchorMin = Vector2.zero; crt.anchorMax = Vector2.one;
            crt.offsetMin = new Vector2(24, 24);
            crt.offsetMax = new Vector2(-24, -106);
            return content;
        }

        // ===================================================================
        // DASHBOARD
        // ===================================================================
        public static GameObject BuildDashboard(Transform parent)
        {
            var panel = SceneBuilder.MakeScreenRoot("Dashboard", parent);
            var content = Header(panel, "Knee Rehabilitation", out _, withBack: false);
            UIFactory.VLayout(content, 16, Pad(20, 20, 20, 20));

            var ui = panel.AddComponent<DashboardUI>();

            ui.welcomeText = UIFactory.Label("Welcome", content.transform,
                "Welcome back", 30, UIFactory.Text, TextAlignmentOptions.Center, FontStyles.Bold);
            UIFactory.Size(ui.welcomeText.gameObject, 40, 44);

            // Connection card
            var connCard = UIFactory.RoundedPanel("ConnectionCard", content.transform, UIFactory.Panel);
            UIFactory.Size(connCard, 160, 170);
            UIFactory.VLayout(connCard, 10, Pad(20, 16, 20, 16));

            var statusRow = UIFactory.Node("StatusRow", connCard.transform);
            UIFactory.HLayout(statusRow, 12, Pad(0, 0, 0, 0));
            UIFactory.Size(statusRow, 44, 48);

            var dot = UIFactory.Panel("Dot", statusRow.transform, UIFactory.TextMuted);
            UIFactory.Size(dot, 36, 36, 36);
            ui.statusIndicator = dot.GetComponent<Image>();

            ui.statusText = UIFactory.Label("StatusText", statusRow.transform, "Brace Disconnected",
                28, UIFactory.Text, TextAlignmentOptions.Left, FontStyles.Bold);

            var connBtn = UIFactory.Button("ConnectBtn", connCard.transform, "Connect Knee Brace",
                UIFactory.Primary, Color.white, 26, out var connLabel);
            ui.connectButton = connBtn;
            ui.connectButtonLabel = connLabel;

            // Today summary row (3 stat blocks)
            var statsRow = UIFactory.Node("TodayStats", content.transform);
            UIFactory.HLayout(statsRow, 16, Pad(0, 0, 0, 0));
            UIFactory.Size(statsRow, 110, 120);

            var (_, countVal) = UIFactory.StatBlock("Count", statsRow.transform, "Exercises today", "0", UIFactory.Primary);
            var (_, durVal) = UIFactory.StatBlock("Duration", statsRow.transform, "Time today", "0s", UIFactory.Primary);
            var (_, recentVal) = UIFactory.StatBlock("Recent", statsRow.transform, "Most recent", "–", UIFactory.Good);
            ui.todayCountText = countVal;
            ui.todayDurationText = durVal;
            ui.recentResultText = recentVal;
            recentVal.fontSize = 22; // longer text

            // Nav buttons
            var startBtn = UIFactory.Button("StartExercise", content.transform, "Start Exercise",
                UIFactory.Good, Color.white, 30, out _);
            UIFactory.Size(startBtn.gameObject, 76, 84);
            ui.startExerciseButton = startBtn;

            var navRow = UIFactory.Node("NavRow", content.transform);
            UIFactory.HLayout(navRow, 16, Pad(0, 0, 0, 0));
            UIFactory.Size(navRow, 70, 76);
            var histBtn = UIFactory.Button("History", navRow.transform, "Exercise History",
                UIFactory.Primary, Color.white, 24, out _);
            var progBtn = UIFactory.Button("Progress", navRow.transform, "Progress",
                UIFactory.Primary, Color.white, 24, out _);
            ui.historyButton = histBtn;
            ui.progressButton = progBtn;

            return panel;
        }

        // ===================================================================
        // EXERCISE SELECTION
        // ===================================================================
        public static GameObject BuildSelection(Transform parent, ExerciseCard cardPrefab, ExerciseData exercise)
        {
            var panel = SceneBuilder.MakeScreenRoot("ExerciseSelection", parent);
            var content = Header(panel, "Choose an Exercise", out var back, withBack: true);

            var ui = panel.AddComponent<ExerciseSelectionUI>();
            ui.backButton = back;
            ui.cardPrefab = cardPrefab;
            ui.exercises = new[] { exercise };

            // Scrollable grid
            var scroll = MakeScroll(content.transform, out var viewportContent);
            var grid = viewportContent.AddComponent<GridLayoutGroup>();
            grid.cellSize = new Vector2(560, 280);
            grid.spacing = new Vector2(20, 20);
            grid.padding = Pad(10, 10, 10, 10);
            grid.constraint = GridLayoutGroup.Constraint.Flexible;
            viewportContent.AddComponent<ContentSizeFitter>().verticalFit = ContentSizeFitter.FitMode.PreferredSize;

            ui.cardContainer = viewportContent.transform;
            return panel;
        }

        // ===================================================================
        // INSTRUCTION
        // ===================================================================
        public static GameObject BuildInstruction(Transform parent)
        {
            var panel = SceneBuilder.MakeScreenRoot("ExerciseInstruction", parent);
            var content = Header(panel, "Exercise Instructions", out var back, withBack: true);
            UIFactory.VLayout(content, 14, Pad(20, 20, 20, 20));

            var ui = panel.AddComponent<ExerciseInstructionUI>();
            ui.backButton = back;

            ui.nameText = UIFactory.Label("Name", content.transform, "Exercise", 32,
                UIFactory.Text, TextAlignmentOptions.Center, FontStyles.Bold);
            UIFactory.Size(ui.nameText.gameObject, 42, 46);

            var card = UIFactory.RoundedPanel("InstrCard", content.transform, UIFactory.Panel);
            UIFactory.Size(card, 240, 320);
            UIFactory.VLayout(card, 8, Pad(20, 16, 20, 16));
            ui.instructionsText = UIFactory.Label("Instructions", card.transform, "", 24, UIFactory.Text);
            UIFactory.Size(ui.instructionsText.gameObject, 180, 200);

            ui.repsText = UIFactory.Label("Reps", content.transform, "", 22, UIFactory.TextMuted, TextAlignmentOptions.Center);
            ui.romText = UIFactory.Label("Rom", content.transform, "", 22, UIFactory.TextMuted, TextAlignmentOptions.Center);
            ui.durationText = UIFactory.Label("Duration", content.transform, "", 22, UIFactory.TextMuted, TextAlignmentOptions.Center);
            ui.safetyText = UIFactory.Label("Safety", content.transform, "", 20,
                new Color(0.75f, 0.45f, 0.2f), TextAlignmentOptions.Center);
            UIFactory.Size(ui.safetyText.gameObject, 44, 60);

            var btnRow = UIFactory.Node("Buttons", content.transform);
            UIFactory.HLayout(btnRow, 16, Pad(0, 0, 0, 0));
            UIFactory.Size(btnRow, 76, 84);
            var startBtn = UIFactory.Button("Start", btnRow.transform, "Start Exercise",
                UIFactory.Good, Color.white, 28, out _);
            ui.startButton = startBtn;

            // Countdown overlay (child of panel, on top)
            var overlay = UIFactory.Panel("CountdownOverlay", panel.transform, new Color(0, 0, 0, 0.75f));
            UIFactory.Stretch(UIFactory.Rect(overlay));
            ui.countdownOverlay = overlay;
            ui.countdownLabel = UIFactory.Label("CountdownLabel", overlay.transform, "3", 160,
                Color.white, TextAlignmentOptions.Center, FontStyles.Bold);
            UIFactory.Stretch(UIFactory.Rect(ui.countdownLabel));
            overlay.SetActive(false);

            return panel;
        }

        // ===================================================================
        // LIVE EXERCISE  (most important screen)
        // ===================================================================
        public static GameObject BuildLive(Transform parent, ResultsUI results)
        {
            var panel = SceneBuilder.MakeScreenRoot("LiveExercise", parent);
            // Transparent-ish background so the 3D leg behind the canvas shows through
            // on the right column. We keep solid panels only where we place content.
            var ui = panel.AddComponent<LiveExerciseUI>();
            ui.resultsUI = results;

            // Top bar: exercise name + timer
            var top = UIFactory.Panel("TopBar", panel.transform, UIFactory.Primary);
            var trt = UIFactory.Rect(top);
            trt.anchorMin = new Vector2(0, 1); trt.anchorMax = new Vector2(1, 1);
            trt.pivot = new Vector2(0.5f, 1f); trt.sizeDelta = new Vector2(0, 80);
            ui.exerciseNameText = UIFactory.Label("ExName", top.transform, "Seated Knee Extension",
                30, Color.white, TextAlignmentOptions.Left, FontStyles.Bold);
            var exr = UIFactory.Rect(ui.exerciseNameText.gameObject);
            exr.anchorMin = new Vector2(0, 0); exr.anchorMax = new Vector2(0.7f, 1);
            exr.offsetMin = new Vector2(24, 0); exr.offsetMax = new Vector2(0, 0);
            ui.timerText = UIFactory.Label("Timer", top.transform, "00:00", 36, Color.white,
                TextAlignmentOptions.Right, FontStyles.Bold);
            var tmr = UIFactory.Rect(ui.timerText.gameObject);
            tmr.anchorMin = new Vector2(0.7f, 0); tmr.anchorMax = new Vector2(1, 1);
            tmr.offsetMin = new Vector2(0, 0); tmr.offsetMax = new Vector2(-24, 0);

            // LEFT column: big numbers + gauge + feedback
            var left = UIFactory.Panel("LeftColumn", panel.transform, new Color(1, 1, 1, 0.92f));
            var lrt = UIFactory.Rect(left);
            lrt.anchorMin = new Vector2(0, 0); lrt.anchorMax = new Vector2(0.52f, 1);
            lrt.offsetMin = new Vector2(16, 16); lrt.offsetMax = new Vector2(-8, -88);
            UIFactory.VLayout(left, 12, Pad(20, 20, 20, 20));

            ui.repCounterText = UIFactory.Label("Reps", left.transform, "0 / 10 Reps", 48,
                UIFactory.Primary, TextAlignmentOptions.Center, FontStyles.Bold);
            UIFactory.Size(ui.repCounterText.gameObject, 60, 66);

            // Gauge (radial filled image) + big angle number overlaid
            var gaugeGo = UIFactory.Node("Gauge", left.transform);
            UIFactory.Size(gaugeGo, 240, 260);
            var gaugeBgImg = gaugeGo.AddComponent<Image>();
            gaugeBgImg.color = new Color(0.90f, 0.93f, 0.96f);
            gaugeBgImg.sprite = BuiltinKnob();
            gaugeBgImg.type = Image.Type.Filled;
            gaugeBgImg.fillMethod = Image.FillMethod.Radial360;
            gaugeBgImg.fillAmount = 1f;

            var fillGo = UIFactory.Node("Fill", gaugeGo.transform);
            UIFactory.Stretch(UIFactory.Rect(fillGo), 10);
            var fillImg = fillGo.AddComponent<Image>();
            fillImg.color = UIFactory.Primary;
            fillImg.sprite = BuiltinKnob();
            fillImg.type = Image.Type.Filled;
            fillImg.fillMethod = Image.FillMethod.Radial360;
            fillImg.fillAmount = 0.5f;

            ui.angleText = UIFactory.Label("Angle", gaugeGo.transform, "90°", 72,
                UIFactory.Text, TextAlignmentOptions.Center, FontStyles.Bold);
            UIFactory.Stretch(UIFactory.Rect(ui.angleText.gameObject));

            var gauge = gaugeGo.AddComponent<AngleGauge>();
            gauge.fillImage = fillImg;
            gauge.minAngle = 0; gauge.maxAngle = 120;
            ui.gauge = gauge;

            ui.feedbackText = UIFactory.Label("Feedback", left.transform, "Get ready", 32,
                UIFactory.Good, TextAlignmentOptions.Center, FontStyles.Bold);
            UIFactory.Size(ui.feedbackText.gameObject, 70, 80);

            var secRow = UIFactory.Node("Secondary", left.transform);
            UIFactory.HLayout(secRow, 16, Pad(0, 0, 0, 0));
            UIFactory.Size(secRow, 50, 56);
            ui.romText = UIFactory.Label("Rom", secRow.transform, "ROM: 0°", 26, UIFactory.TextMuted, TextAlignmentOptions.Center);
            ui.speedText = UIFactory.Label("Speed", secRow.transform, "0°/second", 26, UIFactory.TextMuted, TextAlignmentOptions.Center);

            // RIGHT column: live graph (the 3D leg is visible via camera behind;
            // we give the graph a translucent card at the bottom).
            var right = UIFactory.Node("RightColumn", panel.transform);
            var rrt = UIFactory.Rect(right);
            rrt.anchorMin = new Vector2(0.52f, 0); rrt.anchorMax = new Vector2(1, 1);
            rrt.offsetMin = new Vector2(8, 16); rrt.offsetMax = new Vector2(-16, -88);

            var graphCard = UIFactory.Panel("GraphCard", right.transform, new Color(1, 1, 1, 0.88f));
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

            var hint = UIFactory.Label("LegHint", right.transform,
                "3D leg model is shown behind the interface (press Play).", 18,
                UIFactory.TextMuted, TextAlignmentOptions.Center);
            var hrt = UIFactory.Rect(hint.gameObject);
            hrt.anchorMin = new Vector2(0, 0.45f); hrt.anchorMax = new Vector2(1, 0.55f);
            hrt.offsetMin = Vector2.zero; hrt.offsetMax = Vector2.zero;

            return panel;
        }

        // ===================================================================
        // RESULTS
        // ===================================================================
        public static GameObject BuildResults(Transform parent)
        {
            var panel = SceneBuilder.MakeScreenRoot("ExerciseResults", parent);
            var content = Header(panel, "Performance Results", out _, withBack: false);
            UIFactory.VLayout(content, 12, Pad(16, 16, 16, 16));

            var ui = panel.AddComponent<ResultsUI>();

            ui.exerciseNameText = UIFactory.Label("ExName", content.transform, "Exercise", 30,
                UIFactory.Text, TextAlignmentOptions.Center, FontStyles.Bold);
            UIFactory.Size(ui.exerciseNameText.gameObject, 40, 44);

            // Stats grid (2 rows x 5)
            var statsGrid = UIFactory.Node("Stats", content.transform);
            var grid = statsGrid.AddComponent<GridLayoutGroup>();
            grid.cellSize = new Vector2(230, 90);
            grid.spacing = new Vector2(12, 12);
            grid.constraint = GridLayoutGroup.Constraint.FixedColumnCount;
            grid.constraintCount = 5;
            UIFactory.Size(statsGrid, 200, 200);

            ui.repsText = StatInGrid(statsGrid.transform, "Repetitions");
            ui.maxFlexionText = StatInGrid(statsGrid.transform, "Max Flexion");
            ui.maxExtensionText = StatInGrid(statsGrid.transform, "Max Extension");
            ui.maxRomText = StatInGrid(statsGrid.transform, "Max ROM");
            ui.avgRomText = StatInGrid(statsGrid.transform, "Average ROM");
            ui.avgSpeedText = StatInGrid(statsGrid.transform, "Avg Speed");
            ui.durationText = StatInGrid(statsGrid.transform, "Duration");
            ui.consistencyText = StatInGrid(statsGrid.transform, "Consistency");
            ui.overallScoreText = StatInGrid(statsGrid.transform, "Overall Score");

            // Graph
            var graphCard = UIFactory.Panel("GraphCard", content.transform, UIFactory.Panel);
            UIFactory.Size(graphCard, 180, 200);
            var graphGo = UIFactory.Node("ResultsGraph", graphCard.transform);
            UIFactory.Stretch(UIFactory.Rect(graphGo), 16);
            var graph = graphGo.AddComponent<UILineGraph>();
            graph.yMin = 0; graph.yMax = 120; graph.windowSeconds = 0f;
            ui.graph = graph;

            ui.performanceMessageText = UIFactory.Label("PerfMsg", content.transform, "", 24,
                UIFactory.Text, TextAlignmentOptions.Center);
            ui.improvementText = UIFactory.Label("Improve", content.transform, "", 22,
                UIFactory.Primary, TextAlignmentOptions.Center);

            var btnRow = UIFactory.Node("Buttons", content.transform);
            UIFactory.HLayout(btnRow, 16, Pad(0, 0, 0, 0));
            UIFactory.Size(btnRow, 72, 80);
            ui.repeatButton = UIFactory.Button("Repeat", btnRow.transform, "Repeat Exercise",
                UIFactory.Good, Color.white, 24, out _);
            ui.chooseAnotherButton = UIFactory.Button("Choose", btnRow.transform, "Choose Another",
                UIFactory.Primary, Color.white, 24, out _);
            ui.dashboardButton = UIFactory.Button("Dash", btnRow.transform, "Dashboard",
                UIFactory.PrimaryDark, Color.white, 24, out _);

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
            UIFactory.VLayout(content, 16, Pad(20, 20, 20, 20));

            var ui = panel.AddComponent<ProgressUI>();
            ui.backButton = back;

            ui.romSummaryText = UIFactory.Label("RomSummary", content.transform, "Best ROM over time", 24,
                UIFactory.Text, TextAlignmentOptions.Center, FontStyles.Bold);
            var romCard = UIFactory.Panel("RomCard", content.transform, UIFactory.Panel);
            UIFactory.Size(romCard, 160, 200);
            var romGo = UIFactory.Node("RomGraph", romCard.transform);
            UIFactory.Stretch(UIFactory.Rect(romGo), 16);
            ui.romGraph = romGo.AddComponent<UILineGraph>();
            ui.romGraph.yMin = 0; ui.romGraph.yMax = 120; ui.romGraph.windowSeconds = 0f;
            ui.romGraph.lineColor = UIFactory.Good;

            ui.scoreSummaryText = UIFactory.Label("ScoreSummary", content.transform, "Score over time", 24,
                UIFactory.Text, TextAlignmentOptions.Center, FontStyles.Bold);
            var scoreCard = UIFactory.Panel("ScoreCard", content.transform, UIFactory.Panel);
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
            var go = UIFactory.Panel("ExerciseCard", null, UIFactory.Panel);
            var card = go.AddComponent<ExerciseCard>();
            UIFactory.VLayout(go, 8, Pad(20, 16, 20, 16));

            card.nameText = UIFactory.Label("Name", go.transform, "Exercise Name", 28,
                UIFactory.Text, TextAlignmentOptions.Left, FontStyles.Bold);
            UIFactory.Size(card.nameText.gameObject, 36, 40);
            card.descriptionText = UIFactory.Label("Desc", go.transform, "Description", 20, UIFactory.TextMuted);
            UIFactory.Size(card.descriptionText.gameObject, 50, 70);

            var meta = UIFactory.Node("Meta", go.transform);
            UIFactory.HLayout(meta, 12, Pad(0, 0, 0, 0));
            UIFactory.Size(meta, 30, 34);
            card.repsText = UIFactory.Label("Reps", meta.transform, "10 reps", 18, UIFactory.Primary, TextAlignmentOptions.Center);
            card.durationText = UIFactory.Label("Dur", meta.transform, "~1m", 18, UIFactory.Primary, TextAlignmentOptions.Center);
            card.difficultyText = UIFactory.Label("Diff", meta.transform, "Easy", 18, UIFactory.Good, TextAlignmentOptions.Center);

            var startBtn = UIFactory.Button("Start", go.transform, "Start Exercise",
                UIFactory.Good, Color.white, 24, out _);
            card.startButton = startBtn;

            var prefab = SaveAsPrefab(go, "Assets/Prefabs/ExerciseCard.prefab");
            Object.DestroyImmediate(go);
            return prefab.GetComponent<ExerciseCard>();
        }

        public static HistoryRow BuildHistoryRowPrefab()
        {
            var go = UIFactory.Panel("HistoryRow", null, UIFactory.Panel);
            var row = go.AddComponent<HistoryRow>();
            var btn = go.AddComponent<Button>();
            btn.targetGraphic = go.GetComponent<Image>();
            row.button = btn;
            UIFactory.Size(go, 84, 90);
            UIFactory.HLayout(go, 12, Pad(16, 10, 16, 10));

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

        // A soft round sprite for the gauge. We reuse Unity's built-in UI knob/sprite
        // via a generated circle so there is no external dependency.
        private static Sprite _knob;
        private static Sprite BuiltinKnob()
        {
            if (_knob != null) return _knob;
            // Unity ships "UI/Skin/Knob.psd" as a built-in; fall back to a white
            // circle texture if not found.
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
