import { useCallback, useEffect, useRef, useState } from 'react';
import type { Exercise, AngleSample, SessionSummary } from '@/types/exercise';
import type { SensorReading } from '@/types/sensor';
import { useSensor } from '@/services/SensorProvider';
import { RepetitionDetector } from '@/utils/repetitionDetector';
import { getMovementFeedback, type MovementStatus } from '@/utils/movementFeedback';
import { computeSessionSummary } from '@/utils/scoring';

/** Live, per-frame state surfaced to the Live Exercise screen. */
export interface LiveState {
  kneeAngle: number;
  angularVelocity: number;
  currentRom: number;
  reps: number;
  elapsedMs: number;
  status: MovementStatus;
  trace: AngleSample[];
  running: boolean;
  finished: boolean;
}

const INITIAL: LiveState = {
  kneeAngle: 0,
  angularVelocity: 0,
  currentRom: 0,
  reps: 0,
  elapsedMs: 0,
  status: 'Return to starting position',
  trace: [],
  running: false,
  finished: false,
};

/**
 * useExerciseSession — owns the full lifecycle of a live exercise:
 * subscribes to the sensor stream, runs repetition detection, derives live
 * feedback, accumulates the angle trace, and produces a SessionSummary on
 * completion. The UI simply renders the returned state.
 */
export function useExerciseSession(exercise: Exercise) {
  const { service, isConnected } = useSensor();
  const [live, setLive] = useState<LiveState>(INITIAL);
  const summaryRef = useRef<SessionSummary | null>(null);
  const [summary, setSummary] = useState<SessionSummary | null>(null);

  // Mutable session accumulators (avoid re-renders on every sample).
  const detectorRef = useRef(new RepetitionDetector(exercise.repConfig));
  const startTimeRef = useRef(0);
  const traceRef = useRef<AngleSample[]>([]);
  const speedsRef = useRef<number[]>([]);
  const minAngleRef = useRef(Number.POSITIVE_INFINITY);
  const maxAngleRef = useRef(Number.NEGATIVE_INFINITY);
  const finishedRef = useRef(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    service.stopStreaming();
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;

    const durationMs = Date.now() - startTimeRef.current;
    const result = computeSessionSummary({
      exercise,
      reps: detectorRef.current.records,
      durationMs,
      angleTrace: traceRef.current,
      speedSamples: speedsRef.current,
    });
    summaryRef.current = result;
    setSummary(result);
    setLive((prev) => ({ ...prev, running: false, finished: true }));
  }, [exercise, service]);

  const handleReading = useCallback(
    (reading: SensorReading) => {
      if (finishedRef.current) return;

      const now = Date.now();
      const elapsedMs = now - startTimeRef.current;
      const tSec = Math.round((elapsedMs / 1000) * 10) / 10;

      // Accumulate trace (cap length to keep memory bounded on long sessions).
      traceRef.current.push({ t: tSec, angle: reading.kneeAngle });
      if (traceRef.current.length > 6000) traceRef.current.shift();

      speedsRef.current.push(Math.abs(reading.angularVelocity));
      minAngleRef.current = Math.min(minAngleRef.current, reading.kneeAngle);
      maxAngleRef.current = Math.max(maxAngleRef.current, reading.kneeAngle);

      const repCompleted = detectorRef.current.update(reading.kneeAngle, now);
      const reps = detectorRef.current.count;

      const status = getMovementFeedback(
        reading.kneeAngle,
        reading.angularVelocity,
        exercise.repConfig
      );

      const currentRom =
        maxAngleRef.current - minAngleRef.current > 0
          ? Math.round((maxAngleRef.current - minAngleRef.current) * 10) / 10
          : 0;

      setLive({
        kneeAngle: reading.kneeAngle,
        angularVelocity: reading.angularVelocity,
        currentRom,
        reps,
        elapsedMs,
        status,
        trace: traceRef.current.slice(),
        running: true,
        finished: false,
      });

      // Auto-complete when the target number of reps is reached.
      if (repCompleted && reps >= exercise.targetReps) {
        finish();
      }
    },
    [exercise, finish]
  );

  /** Begin the live session (call after the countdown). */
  const start = useCallback(() => {
    // Reset accumulators.
    detectorRef.current = new RepetitionDetector(exercise.repConfig);
    traceRef.current = [];
    speedsRef.current = [];
    minAngleRef.current = Number.POSITIVE_INFINITY;
    maxAngleRef.current = Number.NEGATIVE_INFINITY;
    finishedRef.current = false;
    startTimeRef.current = Date.now();
    summaryRef.current = null;
    setSummary(null);
    setLive({ ...INITIAL, running: true });

    unsubscribeRef.current = service.onReading(handleReading);
    service.startStreaming({
      startAngle: exercise.repConfig.startAngle,
      targetAngle: exercise.repConfig.targetAngle,
      repPeriodMs: Math.round(
        (exercise.estimatedSeconds * 1000) / exercise.targetReps
      ),
    });
  }, [exercise, handleReading, service]);

  /** Stop early and finalise the summary with whatever was completed. */
  const stop = useCallback(() => {
    finish();
  }, [finish]);

  // Start the session automatically on mount and clean up on unmount. This is
  // resilient to React 18 StrictMode's double mount/cleanup in development:
  // each mount starts a fresh stream and each cleanup tears it down.
  useEffect(() => {
    start();
    return () => {
      unsubscribeRef.current?.();
      service.stopStreaming();
    };
    // We intentionally start once per mount; `start` is stable for a given
    // exercise/service, so this effect does not re-run spuriously.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { live, summary, start, stop, isConnected };
}
