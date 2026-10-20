using System;
using System.Collections.Generic;
using UnityEngine;
using KneeRehab.Sensors;
using KneeRehab.Data;

namespace KneeRehab.ExerciseSystem
{
    /// <summary>
    /// The runtime brain of a live exercise session. It is the ONLY place that
    /// consumes raw sensor samples and turns them into reps / ROM / speed / score.
    /// The 3D leg, live graph, and UI all read from ExerciseManager's events and
    /// public properties — never from the sensor directly — so there is a single
    /// source of truth.
    ///
    /// Lifecycle:
    ///   BeginSession(exercise)  -> configures simulator, resets trackers
    ///   (countdown handled by UI) -> StartMeasuring()
    ///   ...per-sample updates raise SampleProcessed / RepCompleted / FeedbackChanged
    ///   target reps reached      -> auto CompleteSession() -> SessionCompleted(session)
    ///
    /// Persistent singleton. ATTACH TO: a GameObject named "ExerciseManager".
    /// Requires SensorService and ExerciseHistoryManager to exist in the scene.
    /// </summary>
    public class ExerciseManager : MonoBehaviour
    {
        public static ExerciseManager Instance { get; private set; }

        [Header("Feedback speed band (deg/s)")]
        public float idealSpeedMin = 20f;
        public float idealSpeedMax = 60f;
        [Tooltip("Above this, feedback warns the user to slow down.")]
        public float tooFastSpeed = 90f;

        [Header("Graph sampling")]
        [Tooltip("How many angle samples to keep for the results trace.")]
        public int maxStoredSamples = 2000;

        // ---- Live, read-only state the UI binds to ----
        public ExerciseData CurrentExercise { get; private set; }
        public bool IsMeasuring { get; private set; }
        public float ElapsedSeconds { get; private set; }
        public float CurrentAngle { get; private set; }
        public float CurrentSpeed { get; private set; }     // abs deg/s (smoothed)
        public int RepCount => _detector?.RepCount ?? 0;
        public int TargetReps => CurrentExercise != null ? CurrentExercise.targetRepetitions : 0;
        public float CurrentRom => _rom?.CurrentRom ?? 0f;
        public string CurrentFeedback { get; private set; } = "Get ready";

        // ---- Events for consumers ----
        /// <summary>Every processed sample: (angle, speed). Drives 3D leg + graph + numbers.</summary>
        public event Action<float, float> SampleProcessed;
        /// <summary>Rep completed: (repNumber). UI updates the counter.</summary>
        public event Action<int> RepCompleted;
        /// <summary>Feedback text changed.</summary>
        public event Action<string> FeedbackChanged;
        /// <summary>Session finished (target reached). Carries the saved record.</summary>
        public event Action<ExerciseSession> SessionCompleted;

        // ---- Internal trackers ----
        private RepetitionDetector _detector;
        private RomTracker _rom;
        private readonly List<float> _angleTrace = new List<float>();
        private readonly List<float> _timeTrace = new List<float>();
        private readonly List<float> _speedSamples = new List<float>();

        private int _sampleDecimator;

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }

        /// <summary>
        /// Prepare a session for the given exercise. Configures the simulator waveform
        /// and resets all trackers. Does NOT start measuring yet (the UI runs the
        /// 3-2-1 countdown first, then calls StartMeasuring()).
        /// </summary>
        public void BeginSession(ExerciseData exercise)
        {
            CurrentExercise = exercise ?? throw new ArgumentNullException(nameof(exercise));

            _detector = new RepetitionDetector(
                exercise.extendedEnterThreshold,
                exercise.returnedThreshold);
            _detector.RepetitionCompleted += OnRepetitionCompleted;

            _rom = new RomTracker();
            _rom.Reset();

            _angleTrace.Clear();
            _timeTrace.Clear();
            _speedSamples.Clear();
            _sampleDecimator = 0;
            ElapsedSeconds = 0f;
            CurrentAngle = exercise.targetMaximumAngle;
            CurrentSpeed = 0f;
            IsMeasuring = false;
            SetFeedback("Get ready");

            // Pace the simulator to this exercise.
            SensorService.Instance?.ConfigureSimulation(
                exercise.targetMaximumAngle,
                exercise.targetMinimumAngle,
                exercise.estimatedSecondsPerRep);
        }

        /// <summary>Called by the live screen after the countdown finishes.</summary>
        public void StartMeasuring()
        {
            if (CurrentExercise == null) return;
            IsMeasuring = true;
            SetFeedback("Begin when ready");

            var svc = SensorService.Instance;
            if (svc != null)
            {
                svc.NewData += OnSensorData;
            }
        }

        public void StopMeasuring()
        {
            IsMeasuring = false;
            var svc = SensorService.Instance;
            if (svc != null) svc.NewData -= OnSensorData;
        }

        /// <summary>
        /// Advance the session clock on the main thread, once per frame, independent
        /// of how many sensor samples arrive. Keeps the timer accurate in both
        /// simulated (1 sample/frame) and network (many samples/frame) modes.
        /// </summary>
        private void Update()
        {
            if (IsMeasuring) ElapsedSeconds += Time.deltaTime;
        }

        private void OnSensorData(KneeSensorData data)
        {
            if (!IsMeasuring) return;

            CurrentAngle = data.kneeAngle;

            // Smoothed absolute speed for display + feedback.
            float instSpeed = Mathf.Abs(data.angularVelocity);
            CurrentSpeed = Mathf.Lerp(CurrentSpeed, instSpeed, 0.25f);
            _speedSamples.Add(instSpeed);

            _rom.Observe(data.kneeAngle);
            _detector.Process(data.kneeAngle);

            // Store a decimated trace for the results graph (keep file small).
            _sampleDecimator++;
            if (_sampleDecimator >= 2)
            {
                _sampleDecimator = 0;
                if (_angleTrace.Count < maxStoredSamples)
                {
                    _angleTrace.Add(data.kneeAngle);
                    _timeTrace.Add(ElapsedSeconds);
                }
            }

            UpdateFeedback(data.kneeAngle);

            SampleProcessed?.Invoke(data.kneeAngle, CurrentSpeed);
        }

        private void OnRepetitionCompleted(int repNumber, float repMin, float repMax)
        {
            _rom.RecordRepetition(repMin, repMax);
            RepCompleted?.Invoke(repNumber);

            if (repNumber >= TargetReps)
            {
                CompleteSession();
            }
        }

        /// <summary>
        /// Simple, non-diagnostic exercise feedback based on angle / speed / state.
        /// </summary>
        private void UpdateFeedback(float angle)
        {
            var ex = CurrentExercise;
            if (ex == null) return;

            if (CurrentSpeed > tooFastSpeed)
            {
                SetFeedback("Move more slowly");
                return;
            }

            switch (_detector.State)
            {
                case RepetitionDetector.MovementState.Extending:
                    if (angle > ex.targetMinimumAngle + 20f)
                        SetFeedback("Keep extending your knee");
                    else
                        SetFeedback("Good movement");
                    break;

                case RepetitionDetector.MovementState.Extended:
                    SetFeedback("Great! Hold, then return to the start");
                    break;

                case RepetitionDetector.MovementState.Returning:
                    SetFeedback("Return slowly to the starting position");
                    break;

                default: // Waiting
                    SetFeedback(RepCount == 0 ? "Begin when ready" : "Good — next repetition");
                    break;
            }
        }

        private void SetFeedback(string msg)
        {
            if (msg == CurrentFeedback) return;
            CurrentFeedback = msg;
            FeedbackChanged?.Invoke(msg);
        }

        /// <summary>
        /// Finalize: compute score, build the session record, save it, raise the
        /// completion event. Called automatically on reaching target reps, or can be
        /// called early (e.g. a "Stop" button) if you add one.
        /// </summary>
        public void CompleteSession()
        {
            if (CurrentExercise == null) return;
            StopMeasuring();
            SetFeedback("Exercise Complete!");

            float avgSpeed = 0f;
            if (_speedSamples.Count > 0)
            {
                float s = 0f;
                foreach (var v in _speedSamples) s += v;
                avgSpeed = s / _speedSamples.Count;
            }

            var breakdown = ExerciseScoreCalculator.Calculate(
                achievedAverageRom: _rom.AverageRom,
                targetRom: CurrentExercise.TargetRom,
                completedReps: _detector.RepCount,
                targetReps: TargetReps,
                perRepRom: _rom.PerRepRom,
                averageSpeed: avgSpeed,
                idealSpeedMin: idealSpeedMin,
                idealSpeedMax: idealSpeedMax);

            var session = new ExerciseSession
            {
                sessionId = Guid.NewGuid().ToString(),
                dateIso = DateTime.Now.ToString("o"),
                exerciseName = CurrentExercise.exerciseName,
                repetitionsCompleted = _detector.RepCount,
                repetitionsTarget = TargetReps,
                durationSeconds = ElapsedSeconds,
                maxFlexion = _rom.MaxFlexion,
                maxExtension = _rom.MaxExtension,
                maxRom = _rom.BestRom,
                averageRom = _rom.AverageRom,
                averageSpeed = avgSpeed,
                consistencyScore = Mathf.RoundToInt(breakdown.consistencyScore),
                overallScore = breakdown.overall,
                angleSamples = new List<float>(_angleTrace),
                timeSamples = new List<float>(_timeTrace),
            };

            ExerciseHistoryManager.Instance?.AddSession(session);
            SessionCompleted?.Invoke(session);
        }

        private void OnDestroy()
        {
            StopMeasuring();
            if (_detector != null) _detector.RepetitionCompleted -= OnRepetitionCompleted;
            if (Instance == this) Instance = null;
        }
    }
}
