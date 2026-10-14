# ReHabKnee — Intelligent Knee Rehabilitation Monitor (Prototype)

A web-app prototype for a **smart knee exoskeleton / knee brace rehabilitation
system**. It guides a patient through rehabilitation exercises, streams **live
IMU sensor data**, runs **edge-AI movement analysis**, and explains how the
architecture could extend to a **5G AI-RAN edge** deployment.

> ⚠️ ReHabKnee is a **rehabilitation exercise monitoring prototype**. Movement
> scores are custom indicators, **not** clinical diagnoses or validated
> rehabilitation measures. It does not provide medical advice.

---

## ✨ Features

- **Dashboard** — connection status, infrastructure status, today's progress, recent sessions.
- **Connect Knee Brace** — choose **Simulation**, **Bluetooth (BLE)** or **Wi-Fi (WebSocket)**; live values, link quality, calibration, reconnect.
- **Five exercises** — Sit-to-Stand, Leg Extension, Squat, Hamstring Curls, Lunges (configurable target reps & angle per session).
- **Live session** — animated knee figure, live angle gauge/graph, rep counter, edge-AI analysis panel, measured inference latency, and **Start / Pause / Resume / End / Reset** controls.
- **Edge AI movement analysis** — rule-based state machine producing phases, rep classification (good / incomplete / too-fast / inconsistent), ROM, smoothness, consistency and evidence-based feedback.
- **Latency comparison** — measured local-edge vs cloud processing times (cloud clearly labelled simulated when no backend is connected).
- **Results & analytics** — per-rep ROM chart, smoothness/consistency, custom score with a transparent breakdown.
- **History** — stored sessions + progress graphs.
- **AI-RAN & Edge Intelligence** — data-flow diagram, AI-for/on/and-RAN concepts, and an interactive local-edge / cloud / conceptual-AI-RAN scenario comparison.

---

## 🚀 Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

Scripts: `npm run build`, `npm run preview`, `npm run lint`.

### Demo walkthrough
Dashboard → **Connect Knee Brace** (pick *Simulation*) → **Exercises** → choose one → set targets → **Start** (3-2-1) → watch the live knee figure, graph, rep counter and edge-AI feedback → finish → **Results** → **History** / **AI-RAN** dashboard.

---

## 🧱 Architecture

```
Knee Brace Sensors → Microcontroller → BLE / Wi-Fi → Edge AI → Dashboard → Analytics
```

```
src/
├── components/           Reusable UI (gauge, knee figure, charts, AI panel, latency panel, data-flow, …)
├── pages/                One screen per route (Dashboard, Connect, Live Session, Results, History, AI-RAN)
├── hooks/                useExerciseSession — orchestrates source → inference → analysis
├── services/
│   ├── sensor/           Modular adapters: Simulated / BLE / WebSocket (behind SensorSource)
│   ├── analysis/         MovementAnalyzer interface + RuleBasedMovementAnalyzer
│   ├── inference/        Local-edge & cloud inference services + latency tracker
│   ├── PlatformProvider  Single source of truth: sensor mode, inference mode, infra status
│   ├── historyStore      localStorage session persistence (seeded demo data)
│   └── sessionConfigStore Carries per-session targets to the live screen
├── types/                sensor, exercise, analysis contracts
├── data/                 Exercise library + seeded demo history
└── utils/                Signal filtering, scoring, formatting
```

### Modular sensor adapters
Everything depends on the `SensorSource` interface. Switching transport is just
picking a mode in **Connect** — or constructing a different adapter in
`PlatformProvider`. **In real modes (BLE/WebSocket) no data is fabricated**: if
hardware isn't connected, the dashboard stays empty with a clear disconnected
state. BLE/WebSocket frame parsing is isolated to a single `parseFrame` /
`parseMessage` method per adapter, so a specific controller/firmware can be
integrated later without touching the rest of the app.

### Movement analysis (edge AI)
`RuleBasedMovementAnalyzer` is a transparent state machine
(`ready → concentric → hold → eccentric → rest`) with per-exercise thresholds
and hysteresis so sensor noise cannot double-count reps. It is **not** a trained
model — labelled "rule-based" throughout. The `MovementAnalyzer` interface is
designed to later accept a trained time-series model with no UI changes.

### Inference & infrastructure (honesty rules)
- **Local Edge** runs the analyzer in-browser; inference time is **measured**.
- **Cloud** can POST to a real endpoint (measured); without one it runs locally with a clearly **simulated** network delay (`simulated: true`).
- The infrastructure badge shows **Local Edge AI / Cloud AI / Simulation Mode**. **AI-RAN Edge is never claimed** unless a compatible AI-RAN backend is actually confirmed. The AI-RAN dashboard presents AI-RAN as **conceptual** and separates measured from illustrative figures.

---

## ✅ Implemented vs. 🔧 future integration

| Area | Status |
|---|---|
| Simulation sensor mode | ✅ Fully working |
| BLE adapter (Web Bluetooth) | ✅ Working interface; 🔧 adjust `parseFrame` to your firmware |
| WebSocket adapter | ✅ Working interface; 🔧 point to your device URL / schema |
| Rule-based movement analysis | ✅ Fully working |
| Trained ML model | 🔧 Interface ready (`MovementAnalyzer`); no model shipped |
| Local-edge inference + latency | ✅ Measured |
| Cloud inference | ✅ Interface + simulated fallback; 🔧 provide real endpoint |
| AI-RAN edge | 🔧 Conceptual only — not a real cellular network |
| Session history / analytics | ✅ Working (localStorage) |

---

## 📝 Notes
- No backend required. History is stored in `localStorage` (seeded demo data on first run; **Reset demo data** / **Clear all** on the History page).
- Accessible design: large text/buttons, high contrast, responsive, reduced-motion support.
```
