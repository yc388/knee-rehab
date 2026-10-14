import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlatform } from '@/services/PlatformProvider';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { InfraStatusBadge } from '@/components/InfraStatusBadge';
import type { SensorMode } from '@/types/sensor';
import type { SensorReading } from '@/types/sensor';
import './ConnectPage.css';

const MODES: { id: SensorMode; label: string; icon: string; blurb: string }[] = [
  {
    id: 'simulation',
    label: 'Simulation',
    icon: '🧪',
    blurb: 'Realistic generated motion. No hardware needed — ideal for demos.',
  },
  {
    id: 'ble',
    label: 'Bluetooth (BLE)',
    icon: '📶',
    blurb: 'Connect a compatible sensor controller via Web Bluetooth.',
  },
  {
    id: 'websocket',
    label: 'Wi-Fi (WebSocket)',
    icon: '🌐',
    blurb: 'Connect a microcontroller/edge device over a WebSocket bridge.',
  },
];

/** Dedicated Connect Knee Brace feature: mode, config, live values, quality. */
export function ConnectPage() {
  const {
    sensorMode,
    setSensorMode,
    source,
    connectionState,
    isConnected,
    quality,
    connectionConfig,
    setConnectionConfig,
    connect,
    disconnect,
    reconnect,
    lastError,
    infrastructure,
  } = usePlatform();
  const navigate = useNavigate();

  const [latest, setLatest] = useState<SensorReading | null>(null);
  const connecting =
    connectionState === 'connecting' || connectionState === 'reconnecting';

  // Peek live values on this page (so the user can verify the link).
  useEffect(() => {
    if (!isConnected) {
      setLatest(null);
      return;
    }
    const off = source.onReading(setLatest);
    source.startStreaming();
    return () => {
      off();
      source.stopStreaming();
    };
  }, [isConnected, source]);

  const realMode = sensorMode !== 'simulation';

  return (
    <div className="page page--narrow">
      <h1>Connect Knee Brace</h1>
      <p className="text-muted">
        Choose how the application receives sensor data. In Simulation mode the
        app generates realistic movement; in a real mode it only shows data from
        connected hardware — never fabricated readings.
      </p>

      <div className="row row--wrap" style={{ gap: 12, marginBottom: 8 }}>
        <ConnectionStatus state={connectionState} />
        <InfraStatusBadge status={infrastructure} />
      </div>

      <div className="mode-grid">
        {MODES.map((m) => (
          <button
            key={m.id}
            className={`mode-card${sensorMode === m.id ? ' is-active' : ''}`}
            onClick={() => setSensorMode(m.id)}
            disabled={isConnected || connecting}
          >
            <span className="mode-card__icon" aria-hidden="true">
              {m.icon}
            </span>
            <span className="mode-card__label">{m.label}</span>
            <span className="mode-card__blurb">{m.blurb}</span>
          </button>
        ))}
      </div>

      {realMode && (
        <div className="card connect-config">
          <h3>Connection settings</h3>
          {sensorMode === 'websocket' && (
            <label className="field">
              <span>Device WebSocket URL</span>
              <input
                type="text"
                value={connectionConfig.websocketUrl ?? ''}
                onChange={(e) =>
                  setConnectionConfig({
                    ...connectionConfig,
                    websocketUrl: e.target.value,
                  })
                }
                placeholder="ws://192.168.4.1:81"
              />
            </label>
          )}
          {sensorMode === 'ble' && (
            <label className="field">
              <span>GATT Service UUID (optional)</span>
              <input
                type="text"
                value={connectionConfig.bleServiceUuid ?? ''}
                onChange={(e) =>
                  setConnectionConfig({
                    ...connectionConfig,
                    bleServiceUuid: e.target.value,
                  })
                }
                placeholder="0000181a-0000-1000-8000-00805f9b34fb"
              />
            </label>
          )}
          <div className="field-row">
            <label className="field">
              <span>Angle offset (°)</span>
              <input
                type="number"
                value={connectionConfig.angleOffsetDeg ?? 0}
                onChange={(e) =>
                  setConnectionConfig({
                    ...connectionConfig,
                    angleOffsetDeg: Number(e.target.value),
                  })
                }
              />
            </label>
            <label className="field">
              <span>Angle scale</span>
              <input
                type="number"
                step="0.1"
                value={connectionConfig.angleScale ?? 1}
                onChange={(e) =>
                  setConnectionConfig({
                    ...connectionConfig,
                    angleScale: Number(e.target.value),
                  })
                }
              />
            </label>
            <label className="field">
              <span>Expected rate (Hz)</span>
              <input
                type="number"
                value={connectionConfig.expectedSampleRateHz ?? 30}
                onChange={(e) =>
                  setConnectionConfig({
                    ...connectionConfig,
                    expectedSampleRateHz: Number(e.target.value),
                  })
                }
              />
            </label>
          </div>
          <p className="text-muted" style={{ fontSize: '0.9rem', margin: 0 }}>
            Angle convention and filtering are applied in the sensor adapter, so
            different controllers can be calibrated without code changes.
          </p>
        </div>
      )}

      {lastError && <div className="connect-error">⚠️ {lastError}</div>}

      <div className="connect-actions">
        {!isConnected ? (
          <button
            className="btn btn--primary btn--xl btn--block"
            onClick={() => connect()}
            disabled={connecting}
          >
            {connecting ? 'Connecting…' : `Connect (${sensorMode})`}
          </button>
        ) : (
          <div className="row row--wrap">
            <button className="btn btn--ghost" onClick={() => disconnect()}>
              Disconnect
            </button>
            <button
              className="btn btn--primary"
              onClick={() => navigate('/exercises')}
            >
              Choose an exercise →
            </button>
          </div>
        )}
        {connectionState === 'error' && realMode && (
          <button className="btn btn--secondary" onClick={() => reconnect()}>
            Reconnect
          </button>
        )}
      </div>

      {/* Live values peek */}
      {isConnected && (
        <div className="card live-peek">
          <div className="row row--between">
            <h3 style={{ margin: 0 }}>Live sensor values</h3>
            {quality && (
              <span className="quality">
                Signal {quality.score}% · {quality.sampleRateHz} Hz
                {quality.rssi !== null && ` · ${quality.rssi} dBm`}
                {quality.droppedPackets > 0 &&
                  ` · ${quality.droppedPackets} dropped`}
              </span>
            )}
          </div>
          {latest ? (
            <div className="peek-grid">
              <Peek label="Knee angle" value={`${latest.kneeAngle}°`} />
              <Peek label="Angular vel." value={`${latest.angularVelocity}°/s`} />
              <Peek label="Accel X/Y/Z" value={`${latest.accelerationX}/${latest.accelerationY}/${latest.accelerationZ}`} />
              <Peek label="Gyro X/Y/Z" value={`${latest.gyroX}/${latest.gyroY}/${latest.gyroZ}`} />
            </div>
          ) : (
            <p className="text-muted">Waiting for first reading…</p>
          )}
        </div>
      )}

      {!isConnected && realMode && (
        <div className="card disconnected-note">
          <strong>Disconnected.</strong> In {sensorMode} mode the dashboard will
          stay empty until hardware is connected — no simulated values are shown.
        </div>
      )}
    </div>
  );
}

function Peek({ label, value }: { label: string; value: string }) {
  return (
    <div className="peek">
      <span className="peek__label">{label}</span>
      <span className="peek__value">{value}</span>
    </div>
  );
}
