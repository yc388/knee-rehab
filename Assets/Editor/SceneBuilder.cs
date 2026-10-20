#if UNITY_EDITOR
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using KneeRehab.Core;
using KneeRehab.Sensors;
using KneeRehab.Data;
using KneeRehab.ExerciseSystem;
using KneeRehab.UI;
using KneeRehab.Visualization;

namespace KneeRehab.EditorTools
{
    /// <summary>
    /// One-click scene generator. Builds the entire single-scene UI (all 7 panels),
    /// the 3D leg model, both graphs, the singleton managers, and WIRES every
    /// Inspector reference in code. Run via menu:  Tools > Knee Rehab > Build Prototype Scene.
    ///
    /// This exists because the project is authored outside the Unity Editor; rather
    /// than ask you to drag ~100 references by hand, this reproduces the scene
    /// deterministically. Re-run it any time to regenerate from scratch.
    /// </summary>
    public static class SceneBuilder
    {
        private const string ScenePath = "Assets/Scenes/Main.unity";

        [MenuItem("Tools/Knee Rehab/Build Prototype Scene")]
        public static void Build()
        {
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            // --- Camera + light for the 3D leg ---
            var camGo = new GameObject("Main Camera");
            camGo.tag = "MainCamera";
            var cam = camGo.AddComponent<Camera>();
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = new Color(0.90f, 0.93f, 0.96f);
            camGo.transform.position = new Vector3(0f, 1.0f, -3.2f);
            camGo.transform.rotation = Quaternion.Euler(8f, 0f, 0f);
            camGo.AddComponent<AudioListener>();

            var lightGo = new GameObject("Directional Light");
            var light = lightGo.AddComponent<Light>();
            light.type = LightType.Directional;
            light.intensity = 1.1f;
            lightGo.transform.rotation = Quaternion.Euler(50f, -30f, 0f);

            // --- Managers ---
            var sensorService = CreateManager<SensorService>("SensorService");
            var historyManager = CreateManager<ExerciseHistoryManager>("HistoryManager");
            var appState = CreateManager<AppState>("AppState");
            var exerciseManager = CreateManager<ExerciseManager>("ExerciseManager");

            // --- 3D leg model ---
            var (kneeModel, binder) = BuildLegModel();

            // --- Dedicated camera that renders ONLY the leg to a RenderTexture, so
            //     the 3D leg can be shown inside a UI panel on the live screen. ---
            var legRenderTexture = BuildLegCamera(kneeModel.gameObject);

            // --- EventSystem ---
            CreateEventSystem();

            // --- Canvas (scales for tablet/desktop) ---
            var canvas = BuildCanvas();

            // --- ScreenManager on the canvas ---
            var screenManager = canvas.gameObject.AddComponent<ScreenManager>();

            // --- Load/create all exercise assets ---
            var exercises = LoadOrCreateExercises();

            // --- Build prefabs we instantiate at runtime ---
            var cardPrefab = BuildExerciseCardPrefab();
            var historyRowPrefab = BuildHistoryRowPrefab();
            var anglePresetPrefab = BuildAnglePresetButtonPrefab();

            // --- Build each screen panel ---
            var dashboard = BuildDashboard(canvas.transform);
            var selection = BuildSelection(canvas.transform, cardPrefab, exercises);
            var instruction = BuildInstruction(canvas.transform, anglePresetPrefab);
            var results = BuildResults(canvas.transform);
            var live = BuildLive(canvas.transform, results.GetComponent<ResultsUI>(), legRenderTexture, anglePresetPrefab);
            var history = BuildHistory(canvas.transform, historyRowPrefab, results.GetComponent<ResultsUI>());
            var progress = BuildProgress(canvas.transform);

            // --- Wire the ScreenManager panels ---
            screenManager.dashboardPanel = dashboard;
            screenManager.exerciseSelectionPanel = selection;
            screenManager.exerciseInstructionPanel = instruction;
            screenManager.liveExercisePanel = live;
            screenManager.exerciseResultsPanel = results;
            screenManager.exerciseHistoryPanel = history;
            screenManager.progressPanel = progress;
            screenManager.startScreen = AppScreen.Dashboard;

            // Point the model binder at the knee model (already set in BuildLegModel).
            binder.model = kneeModel;

            EditorSceneManager.MarkSceneDirty(scene);
            System.IO.Directory.CreateDirectory("Assets/Scenes");
            EditorSceneManager.SaveScene(scene, ScenePath);

            // Add to build settings.
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };

            Debug.Log("<b>[Knee Rehab]</b> Prototype scene built at " + ScenePath +
                      ". Press Play to run the full Seated Knee Extension flow.");
            EditorUtility.DisplayDialog("Knee Rehab",
                "Prototype scene built successfully.\n\nOpen Assets/Scenes/Main.unity and press Play.",
                "OK");
        }

        private static T CreateManager<T>(string name) where T : Component
        {
            var go = new GameObject(name);
            return go.AddComponent<T>();
        }

        private static void CreateEventSystem()
        {
            var es = new GameObject("EventSystem");
            es.AddComponent<UnityEngine.EventSystems.EventSystem>();
            es.AddComponent<UnityEngine.EventSystems.StandaloneInputModule>();
        }

        private static Canvas BuildCanvas()
        {
            var go = new GameObject("Canvas", typeof(RectTransform));
            var canvas = go.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            var scaler = go.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1280, 800); // tablet/landscape
            scaler.screenMatchMode = CanvasScaler.ScreenMatchMode.MatchWidthOrHeight;
            scaler.matchWidthOrHeight = 0.5f;
            go.AddComponent<GraphicRaycaster>();
            return canvas;
        }

        // --------------------------------------------------------------------
        // 3D LEG MODEL  (placeholder primitives: thigh -> knee -> shin)
        // --------------------------------------------------------------------
        private static (KneeModelController, KneeModelSensorBinder) BuildLegModel()
        {
            var root = new GameObject("KneeModel");
            root.transform.position = new Vector3(0f, 1.0f, 0f);

            // Upper leg (fixed), pointing up from the hip.
            var upper = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            upper.name = "UpperLeg";
            upper.transform.SetParent(root.transform, false);
            upper.transform.localScale = new Vector3(0.22f, 0.5f, 0.22f);
            upper.transform.localPosition = new Vector3(0f, 0.5f, 0f);
            TintPrimitive(upper, new Color(0.35f, 0.45f, 0.6f));

            // Knee joint pivot at the bottom of the upper leg.
            var knee = new GameObject("KneeJoint");
            knee.transform.SetParent(root.transform, false);
            knee.transform.localPosition = Vector3.zero;

            var kneeBall = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            kneeBall.name = "KneeCap";
            kneeBall.transform.SetParent(knee.transform, false);
            kneeBall.transform.localScale = new Vector3(0.28f, 0.28f, 0.28f);
            TintPrimitive(kneeBall, new Color(0.75f, 0.55f, 0.35f));

            // Lower leg pivots at the knee. Pivot child so rotation is about the knee.
            var lower = new GameObject("LowerLeg");
            lower.transform.SetParent(knee.transform, false);
            lower.transform.localPosition = Vector3.zero;

            var shin = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            shin.name = "Shin";
            shin.transform.SetParent(lower.transform, false);
            shin.transform.localScale = new Vector3(0.20f, 0.5f, 0.20f);
            // Offset so it extends downward from the knee when straight.
            shin.transform.localPosition = new Vector3(0f, -0.5f, 0f);
            TintPrimitive(shin, new Color(0.40f, 0.5f, 0.65f));

            var foot = GameObject.CreatePrimitive(PrimitiveType.Cube);
            foot.name = "Foot";
            foot.transform.SetParent(lower.transform, false);
            foot.transform.localScale = new Vector3(0.22f, 0.1f, 0.4f);
            foot.transform.localPosition = new Vector3(0f, -1.0f, 0.12f);
            TintPrimitive(foot, new Color(0.3f, 0.35f, 0.45f));

            var controller = root.AddComponent<KneeModelController>();
            controller.lowerLeg = lower.transform;
            controller.straightEuler = new Vector3(0f, 0f, 0f);   // shin points straight down
            controller.bentEuler = new Vector3(-90f, 0f, 0f);     // 90deg flex swings forward
            controller.referenceBentAngle = 90f;

            var binder = root.AddComponent<KneeModelSensorBinder>();
            binder.model = controller;
            binder.followSensorWhenIdle = true;

            return (controller, binder);
        }

        private static void TintPrimitive(GameObject go, Color c)
        {
            var mr = go.GetComponent<MeshRenderer>();
            // URP/Built-in: create a simple instance material at edit time.
            var shader = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard");
            var mat = new Material(shader);
            mat.color = c;
            // URP/Lit uses _BaseColor; set it too so the tint shows under URP.
            if (mat.HasProperty("_BaseColor")) mat.SetColor("_BaseColor", c);
            mr.sharedMaterial = mat;
            // Remove the auto-added collider; not needed for display.
            var col = go.GetComponent<Collider>();
            if (col != null) Object.DestroyImmediate(col);
        }

        // --------------------------------------------------------------------
        // Leg camera -> RenderTexture (so the 3D leg shows inside a UI panel)
        // --------------------------------------------------------------------
        private static RenderTexture BuildLegCamera(GameObject legRoot)
        {
            // Reposition the leg so a front-ish camera frames it nicely.
            legRoot.transform.position = new Vector3(100f, 0f, 0f); // off to the side, away from UI

            System.IO.Directory.CreateDirectory("Assets/Settings");
            var rtPath = "Assets/Settings/LegRenderTexture.renderTexture";
            var rt = AssetDatabase.LoadAssetAtPath<RenderTexture>(rtPath);
            if (rt == null)
            {
                rt = new RenderTexture(600, 800, 24, RenderTextureFormat.ARGB32)
                {
                    name = "LegRenderTexture",
                    antiAliasing = 2
                };
                AssetDatabase.CreateAsset(rt, rtPath);
                AssetDatabase.SaveAssets();
            }

            var camGo = new GameObject("LegCamera");
            var cam = camGo.AddComponent<Camera>();
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = new Color(0.93f, 0.96f, 0.99f, 1f);
            cam.orthographic = false;
            cam.fieldOfView = 32f;
            cam.targetTexture = rt;
            cam.cullingMask = ~0;
            // Look at the leg from the front, slightly above.
            camGo.transform.position = legRoot.transform.position + new Vector3(0f, 0.1f, -4.2f);
            camGo.transform.rotation = Quaternion.Euler(6f, 0f, 0f);

            // A dedicated light so the leg is lit regardless of scene lighting.
            var lightGo = new GameObject("LegLight");
            var l = lightGo.AddComponent<Light>();
            l.type = LightType.Directional;
            l.intensity = 1.2f;
            lightGo.transform.position = legRoot.transform.position;
            lightGo.transform.rotation = Quaternion.Euler(40f, 20f, 0f);

            return rt;
        }

        // --------------------------------------------------------------------
        // Exercise assets (all four)
        // --------------------------------------------------------------------
        private static ExerciseData[] LoadOrCreateExercises()
        {
            System.IO.Directory.CreateDirectory("Assets/ScriptableObjects");

            var list = new System.Collections.Generic.List<ExerciseData>
            {
                MakeExercise("SeatedKneeExtension", "Seated Knee Extension",
                    ExerciseType.SeatedKneeExtension, ExerciseDifficulty.Easy,
                    "Gently straighten the knee from a seated position to improve extension range.",
                    "Sit upright on a chair with both feet on the floor.\n" +
                    "Slowly extend your knee until your leg is nearly straight.\n" +
                    "Hold the position briefly.\n" +
                    "Slowly return your leg to the starting position.",
                    reps: 10, startAngle: 90f, targetAngle: 15f, secsPerRep: 4f),

                MakeExercise("StandingKneeFlexion", "Standing Knee Flexion",
                    ExerciseType.StandingKneeFlexion, ExerciseDifficulty.Moderate,
                    "Bend the knee while standing to improve flexion range and control.",
                    "Stand tall, holding a stable surface for balance.\n" +
                    "Slowly bend your knee, raising your heel toward your buttock.\n" +
                    "Hold briefly at the top of the movement.\n" +
                    "Slowly lower your foot back to the floor.",
                    reps: 10, startAngle: 15f, targetAngle: 90f, secsPerRep: 4f),

                MakeExercise("SitToStand", "Sit-to-Stand",
                    ExerciseType.SitToStand, ExerciseDifficulty.Challenging,
                    "Stand up and sit down with control to build functional leg strength.",
                    "Sit toward the front of a sturdy chair, feet flat.\n" +
                    "Lean slightly forward and stand up smoothly.\n" +
                    "Pause when fully upright.\n" +
                    "Lower yourself back down with control.",
                    reps: 8, startAngle: 90f, targetAngle: 15f, secsPerRep: 5f),

                MakeExercise("StraightLegRaise", "Straight Leg Raise",
                    ExerciseType.StraightLegRaise, ExerciseDifficulty.Moderate,
                    "Raise a straight leg to strengthen the muscles around the knee.",
                    "Lie or sit with the leg straight out in front of you.\n" +
                    "Keeping the knee straight, raise the whole leg a short distance.\n" +
                    "Hold briefly at the top.\n" +
                    "Slowly lower the leg back down.",
                    reps: 10, startAngle: 15f, targetAngle: 60f, secsPerRep: 4f),
            };

            return list.ToArray();
        }

        private static ExerciseData MakeExercise(string fileName, string name, ExerciseType type,
            ExerciseDifficulty difficulty, string shortDesc, string instructions,
            int reps, float startAngle, float targetAngle, float secsPerRep)
        {
            string path = $"Assets/ScriptableObjects/{fileName}.asset";
            var existing = AssetDatabase.LoadAssetAtPath<ExerciseData>(path);
            if (existing != null) return existing;

            var ex = ScriptableObject.CreateInstance<ExerciseData>();
            ex.exerciseName = name;
            ex.exerciseType = type;
            ex.difficulty = difficulty;
            ex.shortDescription = shortDesc;
            ex.instructions = instructions;
            ex.targetRepetitions = reps;
            // targetMaximumAngle = the "rest/start" (bent) extreme; targetMinimumAngle
            // = the goal extreme. We store the user-facing start/target into these.
            ex.targetMaximumAngle = Mathf.Max(startAngle, targetAngle);
            ex.targetMinimumAngle = Mathf.Min(startAngle, targetAngle);
            ex.estimatedSecondsPerRep = secsPerRep;
            float span = Mathf.Abs(startAngle - targetAngle);
            ex.extendedEnterThreshold = ex.targetMinimumAngle + span * 0.45f;
            ex.returnedThreshold = ex.targetMaximumAngle - span * 0.25f;
            AssetDatabase.CreateAsset(ex, path);
            AssetDatabase.SaveAssets();
            return ex;
        }

        // Header bar used on sub-screens.
        private static GameObject ScreenRoot(string name, Transform parent)
        {
            var panel = UIFactory.Panel(name, parent, UIFactory.Bg);
            UIFactory.Stretch(UIFactory.Rect(panel));
            return panel;
        }

        // The remaining Build* methods live in SceneBuilder.Screens.cs (partial-style
        // split kept as separate static methods for readability).
        // --- Dashboard / Selection / Instruction / Live / Results / History / Progress ---
        // Implemented in SceneBuilderScreens.cs
        internal static GameObject BuildDashboard(Transform p) => SceneBuilderScreens.BuildDashboard(p);
        internal static GameObject BuildSelection(Transform p, ExerciseCard card, ExerciseData[] ex) => SceneBuilderScreens.BuildSelection(p, card, ex);
        internal static GameObject BuildInstruction(Transform p, Button anglePrefab) => SceneBuilderScreens.BuildInstruction(p, anglePrefab);
        internal static GameObject BuildLive(Transform p, ResultsUI r, RenderTexture legRt, Button anglePrefab) => SceneBuilderScreens.BuildLive(p, r, legRt, anglePrefab);
        internal static GameObject BuildResults(Transform p) => SceneBuilderScreens.BuildResults(p);
        internal static GameObject BuildHistory(Transform p, HistoryRow row, ResultsUI r) => SceneBuilderScreens.BuildHistory(p, row, r);
        internal static GameObject BuildProgress(Transform p) => SceneBuilderScreens.BuildProgress(p);
        internal static ExerciseCard BuildExerciseCardPrefab() => SceneBuilderScreens.BuildExerciseCardPrefab();
        internal static HistoryRow BuildHistoryRowPrefab() => SceneBuilderScreens.BuildHistoryRowPrefab();
        internal static Button BuildAnglePresetButtonPrefab() => SceneBuilderScreens.BuildAnglePresetButtonPrefab();
        internal static GameObject MakeScreenRoot(string name, Transform parent) => ScreenRoot(name, parent);
    }
}
#endif
