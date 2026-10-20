using System;
using UnityEngine;

namespace KneeRehab.Sensors
{
    public enum SensorSourceMode
    {
        Simulated,
        Network
    }

    /// <summary>
    /// The application's single access point to sensor data. A persistent
    /// singleton MonoBehaviour that:
    ///   - owns the active IKneeSensorProvider,
    ///   - ticks it every frame on the main thread,
    ///   - re-broadcasts NewData / ConnectionChanged to the whole app,
    ///   - lets the "Connect Knee Brace" button drive connection with a small
    ///     simulated "Connecting..." delay.
    ///
    /// SWITCHING TO REAL HARDWARE:
    /// set Mode = SensorSourceMode.Network in the Inspector. Nothing else changes.
    ///
    /// ATTACH TO: a GameObject named "SensorService" in the main scene (the
    /// SceneBuilder editor tool creates this for you). Marked DontDestroyOnLoad.
    /// </summary>
    public class SensorService : MonoBehaviour
    {
        public static SensorService Instance { get; private set; }

        [Header("Source")]
        [Tooltip("Simulated for the prototype. Switch to Network to use the real brace feed.")]
        public SensorSourceMode Mode = SensorSourceMode.Simulated;

        [Header("Network provider (used only in Network mode)")]
        public string NetworkHost = "192.168.1.50";
        public int NetworkPort = 9000;

        [Header("Simulated connection UX")]
        [Tooltip("Fake delay so the 'Connecting to Knee Brace...' message is visible.")]
        public float SimulatedConnectDelay = 1.6f;

        /// <summary>The active provider. Never null after Awake.</summary>
        public IKneeSensorProvider Provider { get; private set; }

        public bool IsConnected => Provider != null && Provider.IsConnected;
        public bool IsConnecting { get; private set; }
        public KneeSensorData Latest => Provider != null ? Provider.Latest : default;

        /// <summary>Re-broadcast of the provider's per-sample event.</summary>
        public event Action<KneeSensorData> NewData;
        /// <summary>Fires true when fully connected, false when disconnected.</summary>
        public event Action<bool> ConnectionChanged;
        /// <summary>Fires when the "Connecting..." phase starts.</summary>
        public event Action ConnectingStarted;

        private float _connectTimer;

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
            DontDestroyOnLoad(gameObject);

            BuildProvider();
        }

        private void BuildProvider()
        {
            // Detach old handlers if rebuilding.
            if (Provider != null)
            {
                Provider.NewData -= OnProviderData;
                Provider.ConnectionChanged -= OnProviderConnection;
                Provider.Disconnect();
            }

            Provider = Mode == SensorSourceMode.Network
                ? (IKneeSensorProvider)new NetworkKneeSensorProvider(NetworkHost, NetworkPort)
                : new SimulatedKneeSensorProvider();

            Provider.NewData += OnProviderData;
            Provider.ConnectionChanged += OnProviderConnection;
        }

        private void OnProviderData(KneeSensorData data) => NewData?.Invoke(data);
        private void OnProviderConnection(bool connected) => ConnectionChanged?.Invoke(connected);

        /// <summary>
        /// Begin the "Connecting to Knee Brace..." sequence. For the simulator we
        /// wait SimulatedConnectDelay seconds so the UI message is visible, then
        /// actually connect. For Network mode you'd typically connect immediately.
        /// </summary>
        public void BeginConnect()
        {
            if (IsConnected || IsConnecting) return;
            IsConnecting = true;
            _connectTimer = 0f;
            ConnectingStarted?.Invoke();
        }

        public void DisconnectBrace()
        {
            IsConnecting = false;
            Provider?.Disconnect();
        }

        /// <summary>
        /// Switch between the simulated ("Demo") provider and the network ("Actual")
        /// provider at runtime. Disconnects first so the UI returns to a clean state.
        /// </summary>
        public void SetMode(SensorSourceMode mode)
        {
            if (Mode == mode && Provider != null) return;
            DisconnectBrace();
            Mode = mode;
            BuildProvider();
            ConnectionChanged?.Invoke(false);
        }

        /// <summary>
        /// Configure the simulated waveform to match the exercise about to start,
        /// then reset it so the first repetition begins cleanly. No-op for network.
        /// </summary>
        public void ConfigureSimulation(float startAngle, float extendedAngle, float secondsPerRep)
        {
            if (Provider is SimulatedKneeSensorProvider sim)
            {
                sim.StartAngle = startAngle;
                sim.ExtendedAngle = extendedAngle;
                sim.SecondsPerRep = secondsPerRep;
                sim.ResetWaveform();
            }
        }

        private void Update()
        {
            // Resolve the simulated "connecting" delay.
            if (IsConnecting)
            {
                _connectTimer += Time.deltaTime;
                if (_connectTimer >= SimulatedConnectDelay)
                {
                    IsConnecting = false;
                    Provider.Connect();
                }
            }

            // Advance the provider on the main thread every frame.
            Provider?.Tick(Time.deltaTime);
        }

        private void OnDestroy()
        {
            if (Provider != null)
            {
                Provider.NewData -= OnProviderData;
                Provider.ConnectionChanged -= OnProviderConnection;
                Provider.Disconnect();
            }
            if (Instance == this) Instance = null;
        }
    }
}
