import type {
  SensorConnectionConfig,
  SensorMode,
  SensorReading,
} from '@/types/sensor';
import { BaseSensorSource } from './SensorSource';
import { AdaptiveAngleFilter } from '@/utils/signalFilter';

/**
 * WebSocketSensorSource — Wi-Fi/WebSocket adapter for a microcontroller or
 * edge device that streams sensor frames as JSON.
 *
 * REAL transport: if the socket cannot be opened it fails cleanly (error
 * state) and emits NOTHING. It auto-detects drops and supports reconnect().
 *
 * Expected message formats (either is accepted):
 *   { "kneeAngle": 72.1, "angularVelocity": 30, "ax":.., "gx":.., "t": <ms> }
 *   or a bare number (angle only), from which velocity is derived.
 */
export class WebSocketSensorSource extends BaseSensorSource {
  readonly mode: SensorMode = 'websocket';

  private ws: WebSocket | null = null;
  private streaming = false;
  private filter = new AdaptiveAngleFilter();
  private lastAngle: number | null = null;
  private lastTs: number | null = null;

  async connect(config?: SensorConnectionConfig): Promise<void> {
    if (config) this.config = { ...this.config, ...config };
    const url = this.config.websocketUrl;
    if (!url) {
      this.setState('error');
      throw new Error('No WebSocket URL configured (e.g. ws://192.168.1.50:81).');
    }

    this.setState('connecting');
    this.filter.reset();
    this.lastAngle = null;
    this.lastTs = null;

    return new Promise<void>((resolve, reject) => {
      let settled = false;
      let socket: WebSocket;
      try {
        socket = new WebSocket(url);
      } catch (err) {
        this.setState('error');
        reject(err instanceof Error ? err : new Error('Invalid WebSocket URL'));
        return;
      }
      this.ws = socket;

      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          try {
            socket.close();
          } catch {
            /* ignore */
          }
          this.setState('error');
          reject(new Error('WebSocket connection timed out.'));
        }
      }, 8000);

      socket.onopen = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        this.setQuality({
          score: 100,
          rssi: null,
          sampleRateHz: this.config.expectedSampleRateHz ?? 30,
          droppedPackets: 0,
        });
        this.setState('connected');
        resolve();
      };

      socket.onmessage = (ev) => this.handleMessage(ev.data);

      socket.onerror = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          this.setState('error');
          reject(new Error('WebSocket error. Check the device URL and network.'));
        }
      };

      socket.onclose = () => {
        if (this.state === 'connected' || this.streaming) {
          // Unexpected drop — surface it for one-tap reconnect.
          this.streaming = false;
          this.setState('error');
        }
      };
    });
  }

  disconnect(): void {
    this.stopStreaming();
    try {
      this.ws?.close();
    } catch {
      /* ignore */
    }
    this.ws = null;
    this.setState('disconnected');
  }

  startStreaming(): void {
    if (this.state !== 'connected') return;
    this.streaming = true;
    // Many firmwares begin streaming on connect; if yours needs a command,
    // send it here, e.g. this.ws?.send('START').
  }

  stopStreaming(): void {
    this.streaming = false;
  }

  private handleMessage(data: unknown): void {
    if (!this.streaming) return;
    const reading = this.parseMessage(data);
    if (reading) this.emitReading(reading);
    else this.markDropped();
  }

  /** INTEGRATION POINT: adapt to your firmware's message schema. */
  private parseMessage(data: unknown): SensorReading | null {
    try {
      let obj: Record<string, unknown>;
      if (typeof data === 'string') {
        const trimmed = data.trim();
        if (trimmed.startsWith('{')) {
          obj = JSON.parse(trimmed);
        } else {
          const n = Number(trimmed);
          if (Number.isNaN(n)) return null;
          obj = { kneeAngle: n };
        }
      } else if (typeof data === 'object' && data !== null) {
        obj = data as Record<string, unknown>;
      } else {
        return null;
      }

      const rawAngle = num(obj.kneeAngle ?? obj.angle);
      if (rawAngle === null) return null;

      const now = typeof obj.t === 'number' ? (obj.t as number) : Date.now();
      const kneeAngle = this.applyAngleConvention(rawAngle);
      const smoothed = this.filter.filter(kneeAngle, now);

      let angularVelocity = num(obj.angularVelocity ?? obj.velocity ?? obj.gx);
      if (angularVelocity === null) {
        if (this.lastAngle !== null && this.lastTs !== null) {
          const dt = Math.max((now - this.lastTs) / 1000, 1e-3);
          angularVelocity = (smoothed - this.lastAngle) / dt;
        } else {
          angularVelocity = 0;
        }
      }
      this.lastAngle = smoothed;
      this.lastTs = now;

      return {
        timestamp: now,
        kneeAngle: round1(smoothed),
        angularVelocity: round1(angularVelocity),
        accelerationX: num(obj.ax ?? obj.accelerationX) ?? 0,
        accelerationY: num(obj.ay ?? obj.accelerationY) ?? 0,
        accelerationZ: num(obj.az ?? obj.accelerationZ) ?? 0,
        gyroX: num(obj.gx ?? obj.gyroX) ?? 0,
        gyroY: num(obj.gy ?? obj.gyroY) ?? 0,
        gyroZ: num(obj.gz ?? obj.gyroZ) ?? 0,
      };
    } catch {
      return null;
    }
  }
}

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
