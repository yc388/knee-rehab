import { useCallback, useEffect, useRef, useState } from 'react';
import type { Exercise, SessionConfig, AngleSample, SessionSummary } from '@/types/exercise';
import type { SensorReading } from '@/types/sensor';
import type {
  MovementAnalysis,
  InferenceTiming,
  LatencyStats,
} from '@/types/analysis';
import { usePlatform } from '@/services/PlatformProvider';
import { LatencyTracker } from '@/services/inference/latencyTracker';
import { computeSessionSummary } from '@/utils/scoring';

export type SessionStatus = 'idle' | 'running' | 'paused' | 'finished';

const EMPTY_ANALYSIS: MovementAnalysis = {
  phase: 'ready',
  reps: 0,
  goodReps: 0,
  incompleteReps: 0,
  currentRom: 0,
  smoothedAngle: 0,
  speed: 0,
  smoothness: 100,
  consistency: 0,
  romAssessment: 'below-target',
  lastRepClassification: null,
  feedback: 'Ready — press Start when you are set.',
  repJustCompleted: false,
  targetReached: false,
};

export interface LiveSessionState {
  status: SessionStatus;
  analysis: MovementAnalysis;
  kneeAngle: number;
  elapsedMs: number;
  trace: AngleSample[];
  timing: InferenceTiming | null;
  edgeStats: LatencyStats;
  cloudStats: LatencyStats;
}

/**
 * useExerciseSession — orchestrates a live session:
 *   sensor source → inference service (edge/cloud) → movement analysis → UI.
 *
 * Supports Start / Pause / Resume / End / Reset. Reads only come from the
 * selected source: in real sensor modes nothing is fabricated. The active
 * inference backend measures latency, which is accumulated for the comparison
 * panel.
 */
export function useExerciseSession(exercise: Exercise, config: SessionConfig) {
  const {
    source,
    activeInference,
    edgeService,
    cloudAvailability,
    isConnected,
  } = usePlatform();

  const [state, setState] = useState<LiveSessionState>(() => ({
    status: 'idle',
    analysis: EMPTY_ANALYSIS,
    kneeAngle: exercise.repConfig.startAngle,
    elapsedMs: 0,
    trace: [],
    timing: null,
    edgeStats: emptyStats('local-edge'),
    cloudStats: emptyStats('cloud'),
  }));
  const [summary, setSummary] = useState<SessionSummary | null>(null);

  // Mutable accumulators
  const trackerRef = useRef(new LatencyTracker());
  const traceRef = useRef<AngleSample[]>([]);
  const speedsRef = useRef<number[]>([]);
  const startTsRef = useRef(0);
  const pausedAccumRef = useRef(0);
  const pauseStartedRef = useRef(0);
  const statusRef = useRef<SessionStatus>('idle');
  const unsubRef = useRef<(() => void) | null>(null);
  const finishedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const setStatus = (s: SessionStatus) => {
    statusRef.current = s;
    setState((prev) => ({ ...prev, status: s }));
  };

  const handleReading = useCallback(
    async (reading: SensorReading) => {
      if (statusRef.current !== 'running' || finishedRef.current) return;

      const result = await activeInference.infer(reading);
      trackerRef.current.record(result.timing);

      const elapsedMs =
        Date.now() - startTsRef.current - pausedAccumRef.current;
      const tSec = Math.round((elapsedMs / 1000) * 10) / 10;
      traceRef.current.push({ t: tSec, angle: result.analysis.smoothedAngle });
      if (traceRef.current.length > 6000) traceRef.current.shift();
      speedsRef.current.push(result.analysis.speed);

      setState((prev) => ({
        ...prev,
        analysis: result.analysis,
        kneeAngle: result.analysis.smoothedAngle,
        elapsedMs,
        trace: traceRef.current.slice(),
        timing: result.timing,
        edgeStats: trackerRef.current.stats(
          'local-edge',
          edgeService.availability
        ),
        cloudStats: trackerRef.current.stats('cloud', cloudAvailability),
      }));

      if (result.analysis.targetReached) {
        finishSession();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeInference, edgeService, cloudAvailability]
  );

  const start = useCallback(() => {
    if (!isConnected) return;
    finishedRef.current = false;
    trackerRef.current.reset();
    traceRef.current = [];
    speedsRef.current = [];
    pausedAccumRef.current = 0;
    startTsRef.current = Date.now();
    setSummary(null);

    activeInference.reset(exercise, config);
    unsubRef.current = source.onReading((r) => void handleReading(r));
    source.startStreaming({
      startAngle: exercise.repConfig.startAngle,
      targetAngle: config.targetAngle,
      direction: exercise.direction,
      repPeriodMs: Math.round(
        (exercise.estimatedSeconds * 1000) / Math.max(config.targetReps, 1)
      ),
    });

    // Tick the clock even between samples for a smooth timer.
    timerRef.current = setInterval(() => {
      if (statusRef.current !== 'running') return;
      const elapsedMs = Date.now() - startTsRef.current - pausedAccumRef.current;
      setState((prev) => ({ ...prev, elapsedMs }));
    }, 250);

    setStatus('running');
  }, [isConnected, activeInference, exercise, config, source, handleReading]);

  const pause = useCallback(() => {
    if (statusRef.current !== 'running') return;
    pauseStartedRef.current = Date.now();
    source.stopStreaming();
    setStatus('paused');
  }, [source]);

  const resume = useCallback(() => {
    if (statusRef.current !== 'paused') return;
    pausedAccumRef.current += Date.now() - pauseStartedRef.current;
    source.startStreaming({
      startAngle: exercise.repConfig.startAngle,
      targetAngle: config.targetAngle,
      direction: exercise.direction,
    });
    setStatus('running');
  }, [source, exercise, config]);

  const finishSession = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    source.stopStreaming();
    unsubRef.current?.();
    unsubRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);

    const durationMs = Date.now() - startTsRef.current - pausedAccumRef.current;
    const reps = activeInference.getRepMetrics();

    const result = computeSessionSummary({
      exercise,
      config,
      reps,
      durationMs,
      angleTrace: traceRef.current,
      speedSamples: speedsRef.current,
      processingLocation: activeInference.infrastructure,
    });
    setSummary(result);
    setStatus('finished');
  }, [source, exercise, config, activeInference]);

  const reset = useCallback(() => {
    source.stopStreaming();
    unsubRef.current?.();
    unsubRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    finishedRef.current = false;
    trackerRef.current.reset();
    traceRef.current = [];
    speedsRef.current = [];
    pausedAccumRef.current = 0;
    setSummary(null);
    setState({
      status: 'idle',
      analysis: EMPTY_ANALYSIS,
      kneeAngle: exercise.repConfig.startAngle,
      elapsedMs: 0,
      trace: [],
      timing: null,
      edgeStats: emptyStats('local-edge'),
      cloudStats: emptyStats('cloud'),
    });
    statusRef.current = 'idle';
  }, [source, exercise]);

  useEffect(() => {
    return () => {
      unsubRef.current?.();
      source.stopStreaming();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [source]);

  return {
    state,
    summary,
    start,
    pause,
    resume,
    end: finishSession,
    reset,
    isConnected,
  };
}

function emptyStats(location: LatencyStats['location']): LatencyStats {
  return {
    location,
    availability: 'unavailable',
    samples: 0,
    meanTotalMs: null,
    meanInferenceMs: null,
    meanTransmissionMs: null,
    lastTotalMs: null,
    simulated: false,
  };
}
