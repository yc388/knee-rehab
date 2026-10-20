#if UNITY_EDITOR
using UnityEngine;
using UnityEngine.UI;
using TMPro;

namespace KneeRehab.EditorTools
{
    /// <summary>
    /// Small helpers to build uGUI elements from code. Used only by SceneBuilder.
    /// Keeps the builder readable by hiding RectTransform boilerplate.
    /// </summary>
    public static class UIFactory
    {
        public static readonly Color Bg = new Color(0.94f, 0.96f, 0.98f);
        public static readonly Color Panel = Color.white;
        public static readonly Color Primary = new Color(0.16f, 0.55f, 0.72f);
        public static readonly Color PrimaryDark = new Color(0.12f, 0.42f, 0.56f);
        public static readonly Color Text = new Color(0.14f, 0.18f, 0.22f);
        public static readonly Color TextMuted = new Color(0.45f, 0.5f, 0.55f);
        public static readonly Color Good = new Color(0.30f, 0.69f, 0.49f);

        public static RectTransform Rect(GameObject go)
        {
            var rt = go.GetComponent<RectTransform>();
            if (rt == null) rt = go.AddComponent<RectTransform>();
            return rt;
        }

        public static void Stretch(RectTransform rt, float pad = 0f)
        {
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = new Vector2(pad, pad);
            rt.offsetMax = new Vector2(-pad, -pad);
        }

        public static GameObject Node(string name, Transform parent)
        {
            var go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            return go;
        }

        public static GameObject Panel(string name, Transform parent, Color color)
        {
            var go = Node(name, parent);
            var img = go.AddComponent<Image>();
            img.color = color;
            return go;
        }

        public static GameObject RoundedPanel(string name, Transform parent, Color color)
        {
            // We don't ship a sprite; a flat Image reads as a clean card on the
            // healthcare palette. Swap in a rounded sprite later if desired.
            return Panel(name, parent, color);
        }

        public static TextMeshProUGUI Label(string name, Transform parent, string text,
            float size, Color color, TextAlignmentOptions align = TextAlignmentOptions.Left,
            FontStyles style = FontStyles.Normal)
        {
            var go = Node(name, parent);
            var t = go.AddComponent<TextMeshProUGUI>();
            t.text = text;
            t.fontSize = size;
            t.color = color;
            t.alignment = align;
            t.fontStyle = style;
            t.enableWordWrapping = true;
            return t;
        }

        public static Button Button(string name, Transform parent, string text,
            Color bg, Color fg, float fontSize, out TextMeshProUGUI label)
        {
            var go = Node(name, parent);
            var img = go.AddComponent<Image>();
            img.color = bg;
            var btn = go.AddComponent<Button>();
            btn.targetGraphic = img;

            var le = go.AddComponent<LayoutElement>();
            le.minHeight = 64f;
            le.preferredHeight = 72f;

            var labelGo = Node("Label", go.transform);
            Stretch(Rect(labelGo), 8f);
            label = labelGo.AddComponent<TextMeshProUGUI>();
            label.text = text;
            label.fontSize = fontSize;
            label.color = fg;
            label.alignment = TextAlignmentOptions.Center;
            label.fontStyle = FontStyles.Bold;
            return btn;
        }

        public static VerticalLayoutGroup VLayout(GameObject go, float spacing, RectOffset padding,
            TextAnchor align = TextAnchor.UpperCenter)
        {
            var v = go.AddComponent<VerticalLayoutGroup>();
            v.spacing = spacing;
            v.padding = padding;
            v.childAlignment = align;
            v.childControlWidth = true;
            v.childControlHeight = false;
            v.childForceExpandWidth = true;
            v.childForceExpandHeight = false;
            return v;
        }

        public static HorizontalLayoutGroup HLayout(GameObject go, float spacing, RectOffset padding)
        {
            var h = go.AddComponent<HorizontalLayoutGroup>();
            h.spacing = spacing;
            h.padding = padding;
            h.childControlWidth = true;
            h.childControlHeight = true;
            h.childForceExpandWidth = true;
            h.childForceExpandHeight = false;
            return h;
        }

        public static LayoutElement Size(GameObject go, float minH = -1, float prefH = -1, float minW = -1)
        {
            var le = go.GetComponent<LayoutElement>() ?? go.AddComponent<LayoutElement>();
            if (minH >= 0) le.minHeight = minH;
            if (prefH >= 0) le.preferredHeight = prefH;
            if (minW >= 0) le.minWidth = minW;
            return le;
        }

        /// <summary>A labelled stat block: big value on top, caption below.</summary>
        public static (GameObject root, TextMeshProUGUI value) StatBlock(
            string name, Transform parent, string caption, string initial, Color accent)
        {
            var root = RoundedPanel(name, parent, Panel);
            VLayout(root, 2f, new RectOffset(12, 12, 12, 12));
            Size(root, 90, 100);

            var value = Label("Value", root.transform, initial, 40f, accent,
                TextAlignmentOptions.Center, FontStyles.Bold);
            Size(value.gameObject, 50, 56);

            var cap = Label("Caption", root.transform, caption, 18f, TextMuted,
                TextAlignmentOptions.Center);
            Size(cap.gameObject, 22, 26);
            return (root, value);
        }
    }
}
#endif
