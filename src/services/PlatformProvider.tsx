import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  BraceConnectionState,
  LinkQuality,
  SensorConnectionConfig,
  SensorMode,
} from '@/types/sensor';
import type {
  BackendAvailability,
  InferenceMode,
  InfrastructureStatus,
} from '@/types/analysis';
import type { SensorSource } from '@/services/sensor/SensorSource';
import { SimulatedSensorSource } from '@/services/sensor/SimulatedSensorSource';
import { BleSensorSource } from '@/services/sensor/BleSensorSource';
import { WebSocketSensorSource } from '@/services/sensor/WebSocketSensorSource';
import type { InferenceService } from '@/services/inference/InferenceService';
import { LocalEdgeInferenceService } from '@/services/inference/LocalEdgeInferenceService';
import { CloudInferenceService } from '@/services/inference/CloudInferenceService';

/**
 * PlatformProvider — the single source of truth for:
 *   - which sensor adapter is active (simulation / BLE / WebSocket),
 *   - the live connection state + link quality,
 *   - which inference backend is active (edge / cloud),
 *   - the confirmed infrastructure status.
 *
 * Everything the UI needs flows through here, so swapping transports or adding
 * a confirmed AI-RAN backend later touches only this file.
 */
interface PlatformContextValue {
  // Sensor
  sensorMode: SensorMode;
  setSensorMode: (mode: SensorMode) => void;
  source: SensorSource;
  connectionState: BraceConnectionState;
  isConnected: boolean;
  quality: LinkQuality | null;
  connectionConfig: SensorConnectionConfig;
  setConnectionConfig: (c: SensorConnectionConfig) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;
  lastError: string | null;

  // Inference
  inferenceMode: InferenceMode;
  setInferenceMode: (m: InferenceMode) => void;
  edgeService: LocalEdgeInferenceService;
  cloudService: CloudInferenceService;
  activeInference: InferenceService;
  cloudAvailability: BackendAvailability;
  infrastructure: InfrastructureStatus;

  // Access control (prototype): patient vs clinician role.
  role: UserRole;
  setRole: (r: UserRole) => void;
  canReview: boolean;
}

/** Simple role model for access control in the prototype. */
export type UserRole = 'patient' | 'clinician';

const PlatformContext = createContext<PlatformContextValue | null>(null);

function createSource(mode: SensorMode): SensorSource {
  switch (mode) {
    case 'ble':
      return new BleSensorSource();
    case 'websocket':
      return new WebSocketSensorSource();
    case 'simulation':
    default:
      return new SimulatedSensorSource();
  }
}

export function PlatformProvider({ children }: { children: ReactNode }) {
  const [sensorMode, setSensorModeState] = useState<SensorMode>('simulation');
  const [connectionState, setConnectionState] =
    useState<BraceConnectionState>('disconnected');
  const [quality, setQuality] = useState<LinkQuality | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [connectionConfig, setConnectionConfig] =
    useState<SensorConnectionConfig>({
      websocketUrl: 'ws://192.168.4.1:81',
      expectedSampleRateHz: 30,
      angleOffsetDeg: 0,
      angleScale: 1,
      filterAlpha: 0.4,
    });

  const sourceRef = useRef<SensorSource>(createSource('simulation'));

  const [role, setRole] = useState<UserRole>('patient');
  const [inferenceMode, setInferenceMode] = useState<InferenceMode>('edge');
  const edgeRef = useRef(new LocalEdgeInferenceService());
  const cloudRef = useRef(new CloudInferenceService());
  const [cloudAvailability, setCloudAvailability] =
    useState<BackendAvailability>('unavailable');

  // Subscribe to the active source's state/quality.
  useEffect(() => {
    const src = sourceRef.current;
    const offState = src.onConnectionChange(setConnectionState);
    const offQuality = src.onQualityChange(setQuality);
    return () => {
      offState();
      offQuality();
      src.disconnect();
    };
  }, []);

  // Probe cloud availability once on mount.
  useEffect(() => {
    cloudRef.current.checkAvailability().then(setCloudAvailability);
  }, []);

  const setSensorMode = useCallback(
    (mode: SensorMode) => {
      if (mode === sensorMode) return;
      // Tear down the old source and build the new one, re-subscribing.
      sourceRef.current.disconnect();
      const next = createSource(mode);
      sourceRef.current = next;
      setLastError(null);
      setQuality(null);
      next.onConnectionChange(setConnectionState);
      next.onQualityChange(setQuality);
      setSensorModeState(mode);
      setConnectionState('disconnected');
    },
    [sensorMode]
  );

  const connect = useCallback(async () => {
    setLastError(null);
    try {
      await sourceRef.current.connect(connectionConfig);
    } catch (err) {
      setLastError(err instanceof Error ? err.message : 'Connection failed.');
    }
  }, [connectionConfig]);

  const disconnect = useCallback(() => {
    sourceRef.current.disconnect();
  }, []);

  const reconnect = useCallback(async () => {
    setLastError(null);
    try {
      await sourceRef.current.reconnect();
    } catch (err) {
      setLastError(err instanceof Error ? err.message : 'Reconnect failed.');
    }
  }, []);

  const activeInference: InferenceService =
    inferenceMode === 'edge' ? edgeRef.current : cloudRef.current;

  // Infrastructure status: honest about what is actually in use.
  const infrastructure: InfrastructureStatus = useMemo(() => {
    if (sensorMode === 'simulation') return 'simulation';
    if (inferenceMode === 'cloud') return 'cloud';
    return 'local-edge';
    // NOTE: 'ai-ran-edge' is intentionally never returned here. It is only
    // valid once a compatible AI-RAN backend is actually confirmed connected.
  }, [sensorMode, inferenceMode]);

  const value = useMemo<PlatformContextValue>(
    () => ({
      sensorMode,
      setSensorMode,
      source: sourceRef.current,
      connectionState,
      isConnected: connectionState === 'connected',
      quality,
      connectionConfig,
      setConnectionConfig,
      connect,
      disconnect,
      reconnect,
      lastError,
      inferenceMode,
      setInferenceMode,
      edgeService: edgeRef.current,
      cloudService: cloudRef.current,
      activeInference,
      cloudAvailability,
      infrastructure,
      role,
      setRole,
      canReview: role === 'clinician',
    }),
    [
      sensorMode,
      setSensorMode,
      connectionState,
      quality,
      connectionConfig,
      connect,
      disconnect,
      reconnect,
      lastError,
      inferenceMode,
      activeInference,
      cloudAvailability,
      infrastructure,
      role,
    ]
  );

  return (
    <PlatformContext.Provider value={value}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform(): PlatformContextValue {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error('usePlatform must be used within a PlatformProvider');
  return ctx;
}
