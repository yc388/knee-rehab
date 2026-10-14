import type {
  SensorConnectionConfig,
  SensorMode,
  SensorReading,
} from '@/types/sensor';
import { BaseSensorSource } from './SensorSource';
import { AdaptiveAngleFilter } from '@/utils/signalFilter';

/**
 * BleSensorSource — Web Bluetooth adapter for a compatible sensor controller.
 *
 * This is a REAL transport. It connects to a GATT service/characteristic that
 * notifies sensor frames. If no device is chosen or the browser lacks Web
 * Bluetooth, it fails cleanly (state → error) and emits NOTHING — the app
 * never fabricates readings in real sensor mode.
 *
 * The on-wire frame format is intentionally pluggable via `parseFrame`, so a
 * specific microcontroller firmware can be integrated later by adjusting only
 * the parser — not the rest of the app.
 */
const DEFAULT_SERVICE = '0000181a-0000-1000-8000-00805f9b34fb'; // Env. Sensing (example)
const DEFAULT_CHARACTERISTIC = '00002a58-0000-1000-8000-00805f9b34fb';

interface BluetoothLike {
  requestDevice(options: unknown): Promise<BluetoothDeviceLike>;
}
interface BluetoothDeviceLike {
  gatt?: {
    connect(): Promise<BluetoothGattServerLike>;
    disconnect(): void;
    connected: boolean;
  };
  addEventListener(type: string, cb: () => void): void;
  removeEventListener?(type: string, cb: () => void): void;
}
interface BluetoothGattServerLike {
  getPrimaryService(uuid: string): Promise<BluetoothServiceLike>;
}
interface BluetoothServiceLike {
  getCharacteristic(uuid: string): Promise<BluetoothCharacteristicLike>;
}
interface BluetoothCharacteristicLike {
  startNotifications(): Promise<BluetoothCharacteristicLike>;
  stopNotifications(): Promise<BluetoothCharacteristicLike>;
  addEventListener(type: 'characteristicvaluechanged', cb: (e: Event) => void): void;
  value?: DataView;
}

export class BleSensorSource extends BaseSensorSource {
  readonly mode: SensorMode = 'ble';

  private device: BluetoothDeviceLike | null = null;
  private characteristic: BluetoothCharacteristicLike | null = null;
  private streaming = false;
  private filter = new AdaptiveAngleFilter();
  private lastAngle: number | null = null;
  private lastTs: number | null = null;
  private onValue = (e: Event) => this.handleFrame(e);
  private onDisconnect = () => this.handleUnexpectedDisconnect();

  async connect(config?: SensorConnectionConfig): Promise<void> {
    if (config) this.config = { ...this.config, ...config };
    const bluetooth = (navigator as unknown as { bluetooth?: BluetoothLike })
      .bluetooth;
    if (!bluetooth) {
      this.setState('error');
      throw new Error(
        'Web Bluetooth is not available in this browser. Use Chrome/Edge over HTTPS, or choose WebSocket/Simulation mode.'
      );
    }

    this.setState('connecting');
    const serviceUuid = this.config.bleServiceUuid ?? DEFAULT_SERVICE;
    const charUuid = this.config.bleCharacteristicUuid ?? DEFAULT_CHARACTERISTIC;

    try {
      this.device = await bluetooth.requestDevice({
        filters: [{ services: [serviceUuid] }],
        optionalServices: [serviceUuid],
      });
      this.device.addEventListener('gattserverdisconnected', this.onDisconnect);
      const server = await this.device.gatt!.connect();
      const service = await server.getPrimaryService(serviceUuid);
      this.characteristic = await service.getCharacteristic(charUuid);
      this.filter.reset();
      this.lastAngle = null;
      this.lastTs = null;
      this.setQuality({
        score: 100,
        rssi: null,
        sampleRateHz: this.config.expectedSampleRateHz ?? 50,
        droppedPackets: 0,
      });
      this.setState('connected');
    } catch (err) {
      this.setState('error');
      throw err instanceof Error ? err : new Error('BLE connection failed');
    }
  }

  disconnect(): void {
    this.stopStreaming();
    try {
      this.device?.removeEventListener?.('gattserverdisconnected', this.onDisconnect);
      this.device?.gatt?.disconnect();
    } catch {
      /* ignore */
    }
    this.device = null;
    this.characteristic = null;
    this.setState('disconnected');
  }

  startStreaming(): void {
    if (!this.characteristic || this.state !== 'connected') return;
    this.streaming = true;
    this.characteristic.addEventListener('characteristicvaluechanged', this.onValue);
    this.characteristic.startNotifications().catch(() => this.setState('error'));
  }

  stopStreaming(): void {
    this.streaming = false;
    try {
      this.characteristic?.stopNotifications();
    } catch {
      /* ignore */
    }
  }

  private handleFrame(event: Event): void {
    if (!this.streaming) return;
    const target = event.target as unknown as BluetoothCharacteristicLike;
    const value = target?.value;
    if (!value) {
      this.markDropped();
      return;
    }
    const reading = this.parseFrame(value);
    if (reading) this.emitReading(reading);
    else this.markDropped();
  }

  /**
   * Parse a raw BLE frame into a normalised SensorReading.
   *
   * INTEGRATION POINT: adjust this to match your controller's frame layout.
   * Default assumes a little-endian layout:
   *   [int16 angle*100][int16 angVel*100][int16 ax*1000]...[int16 gz*100]
   */
  private parseFrame(view: DataView): SensorReading | null {
    try {
      const now = Date.now();
      const rawAngle = view.getInt16(0, true) / 100;
      const kneeAngle = this.applyAngleConvention(rawAngle);
      const smoothed = this.filter.filter(kneeAngle, now);

      let angularVelocity: number;
      if (view.byteLength >= 4) {
        angularVelocity = view.getInt16(2, true) / 100;
      } else if (this.lastAngle !== null && this.lastTs !== null) {
        const dt = Math.max((now - this.lastTs) / 1000, 1e-3);
        angularVelocity = (smoothed - this.lastAngle) / dt;
      } else {
        angularVelocity = 0;
      }
      this.lastAngle = smoothed;
      this.lastTs = now;

      const g = (i: number) =>
        view.byteLength >= i + 2 ? view.getInt16(i, true) / 1000 : 0;
      return {
        timestamp: now,
        kneeAngle: round1(smoothed),
        angularVelocity: round1(angularVelocity),
        accelerationX: g(4),
        accelerationY: g(6),
        accelerationZ: g(8),
        gyroX: view.byteLength >= 12 ? view.getInt16(10, true) / 100 : 0,
        gyroY: view.byteLength >= 14 ? view.getInt16(12, true) / 100 : 0,
        gyroZ: view.byteLength >= 16 ? view.getInt16(14, true) / 100 : 0,
      };
    } catch {
      return null;
    }
  }

  private handleUnexpectedDisconnect(): void {
    // Connection dropped (out of range / powered off). Surface it so the UI
    // can offer a one-tap reconnect without a page refresh.
    this.streaming = false;
    this.characteristic = null;
    this.setState('error');
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
