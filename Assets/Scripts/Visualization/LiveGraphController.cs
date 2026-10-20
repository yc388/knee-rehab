using UnityEngine;
using KneeRehab.ExerciseSystem;

namespace KneeRehab.Visualization
{
    /// <summary>
    /// Feeds the live UILineGraph from ExerciseManager during a session. Keeps the
    /// graph code (UILineGraph) ignorant of the exercise system; this controller is
    /// the glue.
    ///
    /// ATTACH TO: the live graph GameObject (or any object on the live screen).
    /// INSPECTOR: assign 'graph' = the UILineGraph component.
    /// </summary>
    public class LiveGraphController : MonoBehaviour
    {
        public UILineGraph graph;

        private void OnEnable()
        {
            if (ExerciseManager.Instance != null)
                ExerciseManager.Instance.SampleProcessed += OnSample;

            if (graph != null) graph.Clear();
        }

        private void OnDisable()
        {
            if (ExerciseManager.Instance != null)
                ExerciseManager.Instance.SampleProcessed -= OnSample;
        }

        private void OnSample(float angle, float speed)
        {
            if (graph == null || ExerciseManager.Instance == null) return;
            graph.AddPoint(ExerciseManager.Instance.ElapsedSeconds, angle);
        }
    }
}
