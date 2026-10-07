# ReHabKnee — Smart Knee Brace Rehabilitation Monitor (Prototype)

A modern web-app prototype for a **smart knee exoskeleton / knee brace
rehabilitation system**. It guides a user through knee rehabilitation
exercises, shows **live IMU sensor data** while the exercise is performed, and
produces a performance summary afterwards.

The physical brace is **simulated** for now. The sensor layer is fully modular,
so the simulator can later be swapped for a real IMU feed (over a 5G/edge link)
without touching the UI.

> ⚠️ ReHabKnee is a **rehabilitation exercise monitoring prototype**. It does
> **not** provide medical diagnosis or advice.

---

## ✨ What it does

Full demo flow:

1. **Home Dashboard** – connection status, today's progress, recent sessions.
2. **Connect Knee Brace** – simulated connection handshake → "Brace Connected".
3. **Exercise Selection** – four rehab exercises as cards (easily extensible).
4. **Exercise Instructions** – step-by-step guide, safety note, 3-second countdown.
5. **Live Exercise Session** – rep counter, knee-angle gauge, ROM, speed, timer,
   real-time movement feedback and a continuously-updating knee-angle graph.
6. **Results** – full summary (reps, max flexion/extension, ROM, speed,
   duration, consistency, overall score), session graph and feedback.
7. **Exercise History** – past sessions stored locally, with a progress graph
   (overall score / range of motion over time) and a detailed per-session view.

---

## 🚀 Getting started

**Prerequisites:** [Node.js](https://nodejs.org/) 18+ and npm.

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server (opens http://localhost:5173)
npm run dev
```

Other scripts:

```bash
npm run build     # type-check + production build into dist/
npm run preview   # preview the production build locally
npm run lint      # lint the source
```

### Demo walkthrough

1. Open the app → you land on the **Dashboard**.
2. Press **Connect Knee Brace** → status changes to **Brace Connected**.
3. Press **Start Exercise** → choose e.g. **Seated Knee Extension**.
4. Read the instructions → press **Start Exercise** → watch the **3-second
   countdown**.
5. The **Live Session** begins: simulated knee flexion/extension drives the
   gauge and graph, reps are counted automatically, and feedback updates.
6. After 10 reps the **Results** screen appears automatically (or press
   **Finish** early).
7. Open **History** to see the session saved alongside pre-seeded demo data and
   the progress graph.

> Tip: the History page has **Reset demo data** / **Clear all** buttons for
> clean demos.

---

## 🧱 Project structure

```
src/
├── components/      Reusable UI (gauge, chart, cards, status, metrics, ...)
├── pages/           One screen per route (Dashboard, Live Session, Results, ...)
├── services/        Sensor abstraction + simulator + history persistence
├── hooks/           useExerciseSession — owns the live-session lifecycle
├── types/           Domain + sensor type contracts
├── data/            Exercise definitions + seeded demo history
├── utils/           Rep detection, scoring, movement feedback, formatting
└── styles/          Global styles / design tokens
```

**Tech:** React 18 · TypeScript · Vite · React Router · Recharts.

---

## 🔌 Sensor architecture (the important bit)

The UI never touches simulated data directly. It depends only on the
`SensorService` abstraction:

```
Knee Brace IMU → Edge Device → 5G Network → SensorService → Live Visualisation
```

- **`services/SensorService.ts`** – the interface the whole app depends on
  (`connect`, `disconnect`, `startStreaming`, `onReading`, …) plus a
  `BaseSensorService` that handles subscriber bookkeeping.
- **`services/SimulatedSensorService.ts`** – the current implementation. It
  produces smooth, realistic IMU readings (raised-cosine motion with a hold at
  the peak and band-limited noise), not random numbers.
- **`services/SensorProvider.tsx`** – wires one service instance into React via
  context.

Every reading is normalised to this shape (`types/sensor.ts`):

```ts
interface SensorReading {
  timestamp: number;
  kneeAngle: number;        // degrees (0 = fully extended)
  angularVelocity: number;  // degrees/second
  accelerationX: number;    // g
  accelerationY: number;
  accelerationZ: number;
  gyroX: number;            // degrees/second
  gyroY: number;
  gyroZ: number;
}
```

### Swapping in a real brace later

Implement the `SensorService` interface for your transport (e.g. a WebSocket to
the edge device) and change **one line** in `services/SensorProvider.tsx`:

```ts
// const serviceRef = useRef<SensorService>(new SimulatedSensorService());
const serviceRef = useRef<SensorService>(new RealKneeBraceSensorService(url));
```

No UI components change.

---

## 🔁 Repetition detection

`utils/repetitionDetector.ts` is a small, configurable state machine
(`start → moving → peaked → start`). A repetition is counted only when the knee
travels from the start zone, reaches the target zone, and returns — with
tolerance bands and a `minTravel` guard to ignore sensor jitter.

Thresholds are **per-exercise** (`RepetitionConfig` in `data/exercises.ts`), so
flexion and extension exercises with different ranges both work.

---

## ➕ Adding a new exercise

Append one entry to `EXERCISES` in `src/data/exercises.ts` — including its
`repConfig` thresholds. Selection, instructions, live detection and scoring all
pick it up automatically; no component changes required.

---

## 📝 Notes

- No backend required. Session history is stored in the browser's
  `localStorage` (`services/historyStore.ts`), seeded with demo sessions on
  first run.
- Designed for accessibility: large text and buttons, high contrast, calm
  palette, responsive layout, reduced-motion support.
```
