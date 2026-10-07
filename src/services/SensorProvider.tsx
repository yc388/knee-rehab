import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { BraceConnectionState } from '@/types/sensor';
import type { SensorService } from '@/services/SensorService';
import { SimulatedSensorService } from '@/services/SimulatedSensorService';

/**
 * SensorProvider wires a single SensorService instance into React.
 *
 * To switch from simulated to real brace data, change the one line below that
 * constructs the service (e.g. `new RealKneeBraceSensorService(url)`). Nothing
 * else in the UI needs to change — every component consumes the service and
 * connection state through this context.
 */
interface SensorContextValue {
  service: SensorService;
  connectionState: BraceConnectionState;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const SensorContext = createContext<SensorContextValue | null>(null);

export function SensorProvider({ children }: { children: ReactNode }) {
  // ---- Swap this line to use a real brace service in the future. ----
  const serviceRef = useRef<SensorService>(new SimulatedSensorService());
  // -------------------------------------------------------------------

  const [connectionState, setConnectionState] =
    useState<BraceConnectionState>('disconnected');

  useEffect(() => {
    const service = serviceRef.current;
    const unsubscribe = service.onConnectionChange(setConnectionState);
    return () => {
      unsubscribe();
      service.disconnect();
    };
  }, []);

  const value = useMemo<SensorContextValue>(() => {
    const service = serviceRef.current;
    return {
      service,
      connectionState,
      isConnected: connectionState === 'connected',
      connect: () => service.connect(),
      disconnect: () => service.disconnect(),
    };
  }, [connectionState]);

  return (
    <SensorContext.Provider value={value}>{children}</SensorContext.Provider>
  );
}

/** Access the shared sensor service and connection state. */
export function useSensor(): SensorContextValue {
  const ctx = useContext(SensorContext);
  if (!ctx) {
    throw new Error('useSensor must be used within a SensorProvider');
  }
  return ctx;
}
