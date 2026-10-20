# Knee Rehab Prototype (Unity)

A Unity + C# prototype of a **smart knee-brace rehabilitation monitoring app**, built as
part of a university AI-RAN / 5G exoskeleton project. For this first prototype the
physical brace is **not** required — knee-angle / IMU data is **simulated** — but the
architecture is deliberately structured so simulated data can later be swapped for a
real feed over the chain:

```
Knee Brace IMU → Raspberry Pi / Edge → 5G Network → Unity App → Live Monitoring & Analysis
```

> ⚠️ This is a **university prototype and demonstration system**. It provides
> **exercise-performance feedback and rehabilitation-progress visualisation only**.
> It is **not** a medical diagnostic system and its scores are not a medical diagnosis.

---

## Quick start

1. Install **Unity 6 LTS** (6000.x) via Unity Hub. (Code also works on 2021/2022 LTS.)
   - When adding modules, include a build target if you want to build (Windows/Mac/WebGL/Android).
2. Open this folder (`KneeRehabApp`) as a project in Unity Hub.
3. Let Unity import (first import compiles scripts + packages — a minute or two).
4. In the menu bar: **Tools ▸ Knee Rehab ▸ Build Prototype Scene**.
   - This auto-generates the entire scene, all UI panels, the 3D leg, the graphs,
     the manager objects, and wires every Inspector reference for you.
5. Open `Assets/Scenes/Main.unity` (the builder also sets it as the startup scene).
6. Press **Play**.

### The demo flow
Dashboard → **Connect Knee Brace** (status flips to *Brace Connected*) → **Start Exercise**
→ pick **Seated Knee Extension** → read instructions → **Start Exercise** → 3-2-1 countdown
→ live screen: 3D leg moves, angle + gauge update, graph draws smooth 90°→20°→90° waves,
reps auto-count, feedback updates → after 10 reps it auto-completes → **Results** (stats +
full graph + score) → session is **saved** → view it under **Exercise History**, and trends
under **Progress**.

---

## Architecture at a glance

The one rule that makes future hardware integration painless:
**nothing downstream reads the sensor directly — everything goes through an interface.**

```
IKneeSensorProvider  (interface, the single seam)
   ├── SimulatedKneeSensorProvider   ← used now (realistic wave motion, not noise)
   └── NetworkKneeSensorProvider     ← future: UDP / WebSocket from the Pi over 5G
            │  (owned + ticked by)
            ▼
       SensorService (singleton)  ── re-broadcasts samples ──┐
            │                                                 │
            ▼                                                 ▼
       ExerciseManager (session brain)              KneeModelSensorBinder (idle preview)
            │  uses pure-logic classes:
            │    RepetitionDetector · RomTracker · ExerciseScoreCalculator
            │  raises events consumed by:
            ├── LiveExerciseUI (numbers, gauge, timer, feedback)
            ├── KneeModelSensorBinder → KneeModelController (3D leg)
            ├── LiveGraphController → UILineGraph (live graph)
            └── on complete → ExerciseSession → ExerciseHistoryManager (JSON save)
```

### To switch to the real brace later
1. Implement the UDP **or** WebSocket receive loop inside `NetworkKneeSensorProvider.cs`
   (the queue/threading plumbing is already in place — see the TODOs).
2. On `SensorService` in the scene, set **Mode = Network** and the host/port.
3. Nothing else changes — the UI, 3D leg, graphs, rep detection, and scoring all keep working.

---

## Script-by-script guide

### `Scripts/Sensors/`
| Script | What it does | Attach to | Key Inspector refs |
|---|---|---|---|
| `KneeSensorData.cs` | Plain struct for one IMU reading (timestamp, kneeAngle, angularVelocity, accel XYZ, gyro XYZ). | — (data only) | — |
| `IKneeSensorProvider.cs` | The interface every data source implements. The single seam between data and app. | — | — |
| `SimulatedKneeSensorProvider.cs` | Generates realistic smooth flex/extend motion (raised-cosine + Perlin noise), not random. | — (created by SensorService) | — |
| `NetworkKneeSensorProvider.cs` | **Stub** for the real Pi/5G feed. Thread-safe queue + drain-on-main-thread wired; UDP/WebSocket marked TODO. | — | — |
| `SensorService.cs` | Singleton that owns the active provider, ticks it each frame, re-broadcasts data, runs the simulated "Connecting…" delay, paces the simulator per exercise. | `SensorService` GameObject | `Mode`, `NetworkHost/Port`, `SimulatedConnectDelay` |

### `Scripts/Exercise/`
| Script | What it does | Attach to | Key Inspector refs |
|---|---|---|---|
| `ExerciseData.cs` | ScriptableObject defining one exercise (name, copy, targets, thresholds). New exercises = new assets, no code. | — (asset) | create via **Create ▸ Knee Rehab ▸ Exercise** |
| `RepetitionDetector.cs` | State machine (Waiting→Extending→Extended→Returning→rep++) with hysteresis so jitter never over-counts. Pure C#. | — | — |
| `RomTracker.cs` | Per-rep & session ROM, best/average, max flexion/extension. Pure C#. | — | — |
| `ExerciseScoreCalculator.cs` | The prototype score: 40% ROM, 25% completion, 20% consistency, 15% speed. All tuning in one file. Pure C#. | — | — |
| `ExerciseManager.cs` | The session brain. Consumes samples, runs detector/ROM/score, raises events, builds + saves the session on completion. | `ExerciseManager` GameObject | speed band, graph sampling |

### `Scripts/Visualization/`
| Script | What it does | Attach to | Key Inspector refs |
|---|---|---|---|
| `KneeModelController.cs` | Rotates the lower leg around the knee from an angle value. Knows nothing about the sensor. | `KneeModel` root | `lowerLeg`, straight/bent Euler, `referenceBentAngle` |
| `KneeModelSensorBinder.cs` | Adapter feeding the model from `ExerciseManager` (and raw sensor when idle). The only link between the two. | `KneeModel` root | `model` |
| `UILineGraph.cs` | Zero-dependency Canvas line graph (subclasses `Graphic`, emits its own mesh). Rolling window or full trace. | a UI RectTransform | yMin/yMax, windowSeconds, colors |
| `LiveGraphController.cs` | Feeds the live graph from `ExerciseManager`. | live graph GameObject | `graph` |
| `AngleGauge.cs` | Radial gauge driven by a Filled Image (+ optional needle). | gauge GameObject | `fillImage`, min/max |

### `Scripts/UI/`
| Script | Screen | Attach to |
|---|---|---|
| `DashboardUI.cs` | Welcome, connection status + Connect button, today's summary, recent result, nav. | Dashboard panel |
| `ExerciseSelectionUI.cs` | Builds exercise cards from the assets list. | ExerciseSelection panel |
| `ExerciseCard.cs` | One exercise card (prefab). | card prefab |
| `ExerciseInstructionUI.cs` | Instructions + Back/Start + 3-2-1 countdown. | ExerciseInstruction panel |
| `LiveExerciseUI.cs` | The live HUD: reps, big angle, gauge, ROM, speed, timer, feedback. | LiveExercise panel |
| `ResultsUI.cs` | Performance stats, full graph, message + suggestion, nav. | ExerciseResults panel |
| `ExerciseHistoryUI.cs` / `HistoryRow.cs` | Scrollable saved-session list; tap to reopen results. | ExerciseHistory panel / row prefab |
| `ProgressUI.cs` | ROM-over-time and score-over-time charts. | Progress panel |

### `Scripts/Core/`
| Script | What it does | Attach to |
|---|---|---|
| `ScreenManager.cs` | Single-scene navigation: shows exactly one panel at a time. | `Canvas` |
| `AppState.cs` | Holds the currently selected exercise across screens. | `AppState` GameObject |

### `Scripts/Data/`
| Script | What it does |
|---|---|
| `ExerciseSession.cs` | Serializable record of a finished session (+ down-sampled angle trace). |
| `ExerciseHistoryManager.cs` | Saves/loads sessions as JSON under `Application.persistentDataPath`. |

### `Editor/` (editor-only, excluded from builds)
| Script | What it does |
|---|---|
| `SceneBuilder.cs` + `SceneBuilderScreens.cs` | **Tools ▸ Knee Rehab ▸ Build Prototype Scene** — generates the whole scene and wires everything. |
| `UIFactory.cs` | uGUI construction helpers used by the builder. |

---

## Adding another exercise (no code)
1. **Create ▸ Knee Rehab ▸ Exercise**, fill in the fields (name, instructions, targets,
   `extendedEnterThreshold`, `returnedThreshold`).
2. Select the `ExerciseSelection` panel in the scene and add the new asset to the
   `exercises` array on `ExerciseSelectionUI`.
3. Done — it appears as a card and runs through the same pipeline.

## Notes / known prototype limits
- The gauge uses Unity's built-in Knob sprite; swap for custom art freely.
- The 3D leg is placeholder primitives (cylinders/sphere/cube) — replace `KneeModel`
  with a real mesh and just reassign `lowerLeg` on `KneeModelController`.
- `NetworkKneeSensorProvider` connects as a stub (no real socket yet) so the UI flow
  can be tested in Network mode; implement the TODOs to stream real data.
