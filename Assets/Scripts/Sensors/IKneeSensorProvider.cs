using System;

namespace KneeRehab.Sensors
{
    /// <summary>
    /// The single seam between "where data comes from" and "the rest of the app".
    ///
    /// Everything downstream (ExerciseManager, graph, 3D leg, UI) depends ONLY on
    /// this interface, never on a concrete provider. Swapping the simulator for a
    /// real Raspberry Pi / 5G feed is therefore a one-line change in SensorService.
    ///
    /// Providers push data via the NewData event AND expose the latest value via
    /// Latest, so consumers can either react (event) or poll (Update loop).
    /// </summary>
    public interface IKneeSensorProvider
    {
        /// <summary>True once the (simulated or real) brace is connected and streaming.</summary>
        bool IsConnected { get; }

        /// <summary>The most recent reading. Valid only while IsConnected is true.</summary>
        KneeSensorData Latest { get; }

        /// <summary>Raised on every new sample (simulator timer, UDP packet, WS frame...).</summary>
        event Action<KneeSensorData> NewData;

        /// <summary>Raised whenever IsConnected changes. Argument = new connected state.</summary>
        event Action<bool> ConnectionChanged;

        /// <summary>
        /// Begin connecting. For the simulator this is instantaneous-ish; for a real
        /// provider this would open the UDP socket / WebSocket. Safe to call twice.
        /// </summary>
        void Connect();

        /// <summary>Stop streaming and release resources (close sockets, stop timers).</summary>
        void Disconnect();

        /// <summary>
        /// Called every frame by SensorService. The simulator advances its waveform
        /// here. A network provider can drain its received-packet queue here so that
        /// NewData is always raised on Unity's main thread.
        /// </summary>
        void Tick(float deltaTime);
    }
}
