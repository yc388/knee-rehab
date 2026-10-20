using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

namespace KneeRehab.Visualization
{
    /// <summary>
    /// A self-contained real-time line graph drawn inside a UI Canvas with zero
    /// external/paid packages. It subclasses UnityEngine.UI.Graphic and emits its
    /// own mesh, so it respects the RectTransform, masking, and canvas scaling just
    /// like any other UI element.
    ///
    /// It plots a rolling window of (x = time, y = value) points, auto-scaling X to
    /// the window and using a fixed Y range (e.g. 0..120 degrees). Call AddPoint()
    /// as data arrives, or SetData() to draw a full stored trace at once.
    ///
    /// ATTACH TO: a UI GameObject (RectTransform) inside the graph panel. Add this
    /// component; no Image needed (Graphic provides the mesh). Set a material or
    /// leave default UI material. SceneBuilder sets this up for the live + results
    /// graphs.
    /// </summary>
    [RequireComponent(typeof(CanvasRenderer))]
    public class UILineGraph : Graphic
    {
        [Header("Value (Y) range, in data units e.g. degrees")]
        public float yMin = 0f;
        public float yMax = 120f;

        [Header("Rolling window (X), in seconds. 0 = show all points via SetData.")]
        public float windowSeconds = 12f;

        [Header("Line appearance")]
        public float lineThickness = 4f;
        public Color lineColor = new Color(0.16f, 0.55f, 0.72f, 1f);

        [Header("Grid")]
        public bool drawGrid = true;
        public int gridRows = 4;
        public Color gridColor = new Color(1f, 1f, 1f, 0.12f);
        public float gridThickness = 1.5f;

        private readonly List<Vector2> _points = new List<Vector2>(); // (time, value)
        private float _latestTime;

        protected override void Awake()
        {
            base.Awake();
            color = lineColor;
        }

        /// <summary>Append a live sample. x is absolute time (seconds).</summary>
        public void AddPoint(float time, float value)
        {
            _latestTime = time;
            _points.Add(new Vector2(time, value));

            // Trim points outside the rolling window for performance.
            if (windowSeconds > 0f)
            {
                float cutoff = _latestTime - windowSeconds;
                int removeCount = 0;
                while (removeCount < _points.Count && _points[removeCount].x < cutoff)
                    removeCount++;
                if (removeCount > 0) _points.RemoveRange(0, removeCount);
            }
            SetVerticesDirty();
        }

        /// <summary>Replace all points with a full trace (used on the results screen).</summary>
        public void SetData(IReadOnlyList<float> times, IReadOnlyList<float> values)
        {
            _points.Clear();
            int n = Mathf.Min(times?.Count ?? 0, values?.Count ?? 0);
            for (int i = 0; i < n; i++)
                _points.Add(new Vector2(times[i], values[i]));
            if (n > 0) _latestTime = times[n - 1];
            SetVerticesDirty();
        }

        public void Clear()
        {
            _points.Clear();
            SetVerticesDirty();
        }

        protected override void OnPopulateMesh(VertexHelper vh)
        {
            vh.Clear();
            Rect r = GetPixelAdjustedRect();

            if (drawGrid && gridRows > 0)
                DrawGrid(vh, r);

            if (_points.Count < 2) return;

            // X domain: rolling window if set, else full span of stored points.
            float xStart, xEnd;
            if (windowSeconds > 0f)
            {
                xEnd = _latestTime;
                xStart = _latestTime - windowSeconds;
            }
            else
            {
                xStart = _points[0].x;
                xEnd = _points[_points.Count - 1].x;
            }
            float xSpan = Mathf.Max(0.0001f, xEnd - xStart);
            float ySpan = Mathf.Max(0.0001f, yMax - yMin);

            Vector2? prev = null;
            foreach (var p in _points)
            {
                float nx = Mathf.Clamp01((p.x - xStart) / xSpan);
                float ny = Mathf.Clamp01((p.y - yMin) / ySpan);
                var cur = new Vector2(r.xMin + nx * r.width, r.yMin + ny * r.height);

                if (prev.HasValue)
                    AddSegment(vh, prev.Value, cur, lineThickness, lineColor);
                prev = cur;
            }
        }

        private void DrawGrid(VertexHelper vh, Rect r)
        {
            for (int i = 0; i <= gridRows; i++)
            {
                float y = r.yMin + (r.height * i / gridRows);
                var a = new Vector2(r.xMin, y);
                var b = new Vector2(r.xMax, y);
                AddSegment(vh, a, b, gridThickness, gridColor);
            }
        }

        /// <summary>Add a thick line segment as a quad between a and b.</summary>
        private static void AddSegment(VertexHelper vh, Vector2 a, Vector2 b, float thickness, Color col)
        {
            Vector2 dir = (b - a);
            if (dir.sqrMagnitude < 1e-6f) return;
            dir.Normalize();
            Vector2 normal = new Vector2(-dir.y, dir.x) * (thickness * 0.5f);

            int idx = vh.currentVertCount;

            var v = UIVertex.simpleVert;
            v.color = col;

            v.position = a - normal; vh.AddVert(v);
            v.position = a + normal; vh.AddVert(v);
            v.position = b + normal; vh.AddVert(v);
            v.position = b - normal; vh.AddVert(v);

            vh.AddTriangle(idx + 0, idx + 1, idx + 2);
            vh.AddTriangle(idx + 2, idx + 3, idx + 0);
        }
    }
}
