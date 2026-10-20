using System;
using System.Collections.Generic;
using UnityEngine;

namespace KneeRehab.Sensors
{
    /// <summary>
    /// PLACEHOLDER for the future real-brace feed:
    ///
    ///     IMU -> Raspberry Pi -> 5G modem -> 5G network -> Unity (this class)
    ///
    /// It implements the SAME IKneeSensorProvider interface as the simulator, so
    /// the rest of the application does not change at all when you switch to real
    /// hardware. Only SensorService decides which provider to instantiate.
    ///
    /// HOW TO FINISH THIS LATER
    /// ------------------------
    /// Two common transports are sketched below. Pick ONE:
    ///
    /// (A) UDP  — lowest latency, tolerant of dropped packets (good for live IMU):
    ///     - Add a System.Net.Sockets.UdpClient, bind to a port in Connect().
    ///     - Receive on a background Thread (UdpClient.Receive is blocking).
    ///     - Parse each datagram (JSON or a tight binary struct) into KneeSensorData.
    ///     - Push parsed samples into _inbox (the thread-safe queue below).
    ///
    /// (B) WebSocket — works through NAT/firewalls, ordered & reliable:
    ///     - Add a WebSocket client (e.g. System.Net.WebSockets.ClientWebSocket,
    ///       or the UPM package "com.endel.nativewebsocket").
    ///     - Connect to ws://<pi-ip>:<port> in Connect().
    ///     - On each text/binary message, parse into KneeSensorData, push to _inbox.
    ///
    /// IMPORTANT THREADING RULE
    /// ------------------------
    /// Sockets receive on background threads, but Unity objects (Transforms, UI,
    /// events that touch them) may only be touched on the main thread. So network
    /// threads must ONLY enqueue into _inbox. Tick() — which SensorService calls on
    /// the main thread every frame — drains the queue and raises NewData. This is
    /// already wired up; you just fill in the socket code where marked TODO.
    /// </summary>
    public class NetworkKneeSensorProvider : IKneeSensorProvider
    {
        private readonly string _host;
        private readonly int _port;

        private bool _connected;
        private KneeSensorData _latest;

        // Thread-safe hand-off from the (future) socket thread to the main thread.
        private readonly Queue<KneeSensorData> _inbox = new Queue<KneeSensorData>();
        private readonly object _inboxLock = new object();

        public NetworkKneeSensorProvider(string host = "192.168.1.50", int port = 9000)
        {
            _host = host;
            _port = port;
        }

        public bool IsConnected => _connected;
        public KneeSensorData Latest => _latest;

        public event Action<KneeSensorData> NewData;
        public event Action<bool> ConnectionChanged;

        public void Connect()
        {
            if (_connected) return;

            // TODO (A) UDP:  _udp = new UdpClient(_port); start receive thread.
            // TODO (B) WS:   _ws = new ClientWebSocket(); await _ws.ConnectAsync(
            //                 new Uri($"ws://{_host}:{_port}"), CancellationToken.None);
            //
            // On successful transport open, set _connected = true and fire the event.
            // Until the socket code is implemented, we mark connected so the UI flow
            // can be exercised, but no samples will arrive (empty _inbox).
            Debug.LogWarning(
                $"[NetworkKneeSensorProvider] Stub connect to {_host}:{_port}. " +
                "Implement UDP or WebSocket receive to stream real IMU data.");

            _connected = true;
            ConnectionChanged?.Invoke(true);
        }

        public void Disconnect()
        {
            if (!_connected) return;

            // TODO: stop the receive thread, close/dispose _udp or _ws.
            _connected = false;
            ConnectionChanged?.Invoke(false);
        }

        /// <summary>
        /// Called on the MAIN thread by SensorService. Drain everything the socket
        /// thread has queued and re-raise it as NewData so Unity objects can react.
        /// </summary>
        public void Tick(float deltaTime)
        {
            if (!_connected) return;

            lock (_inboxLock)
            {
                while (_inbox.Count > 0)
                {
                    _latest = _inbox.Dequeue();
                    NewData?.Invoke(_latest);
                }
            }
        }

        /// <summary>
        /// Call this from the socket receive thread after parsing a packet/frame.
        /// Thread-safe. Example (inside your receive loop):
        ///     var sample = JsonUtility.FromJson&lt;KneeSensorData&gt;(jsonText);
        ///     Enqueue(sample);
        /// </summary>
        public void Enqueue(KneeSensorData sample)
        {
            lock (_inboxLock)
            {
                _inbox.Enqueue(sample);
            }
        }
    }
}
