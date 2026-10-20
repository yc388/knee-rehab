#if UNITY_EDITOR
using UnityEditor;
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
        // Calm, professional healthcare palette (teal + soft slate).
        public static readonly Color Bg = new Color(0.925f, 0.945f, 0.965f);
        public static readonly Color PanelColor = Color.white;
        public static readonly Color Primary = new Color(0.106f, 0.541f, 0.643f);   // teal
        public static readonly Color PrimaryDark = new Color(0.067f, 0.400f, 0.482f);
        public static readonly Color Accent = new Color(0.180f, 0.690f, 0.690f);    // lighter teal
        public static readonly Color Text = new Color(0.137f, 0.188f, 0.235f);      // deep slate
        public static readonly Color TextMuted = new Color(0.447f, 0.498f, 0.549f);
        public static readonly Color Good = new Color(0.180f, 0.690f, 0.490f);      // green
        public static readonly Color Warn = new Color(0.902f, 0.553f, 0.176f);      // amber
        public static readonly Color Danger = new Color(0.843f, 0.329f, 0.310f);    // red
        public static readonly Color Chip = new Color(0.898f, 0.925f, 0.945f);      // unselected chip

        public static RectTransform Rect(GameObject go)
        {
            var rt = go.GetComponent<RectTransform>();
            if (rt == null) rt = go.AddComponent<RectTransform>();
            return rt;
        }

        // Convenience overload: accept any Component (e.g. a TMP label) and resolve
        // its GameObject, so callers can pass a label directly.
        public static RectTransform Rect(Component component)
        {
            return Rect(component.gameObject);
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

        // Unity ships a rounded UI sprite (UISprite.psd) with a 9-slice border, which
        // gives panels/buttons soft rounded corners with no custom art.
        private static Sprite _rounded;
        public static Sprite RoundedSprite()
        {
            if (_rounded != null) return _rounded;
            _rounded = AssetDatabase.GetBuiltinExtraResource<Sprite>("UI/Skin/UISprite.psd");
            return _rounded;
        }

        public static GameObject RoundedPanel(string name, Transform parent, Color color)
        {
            var go = Node(name, parent);
            var img = go.AddComponent<Image>();
            img.color = color;
            var sp = RoundedSprite();
            if (sp != null) { img.sprite = sp; img.type = Image.Type.Sliced; img.pixelsPerUnitMultiplier = 2.5f; }
            return go;
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
            // Labels must never intercept clicks meant for buttons underneath them
            // (e.g. a stretched title label sitting over a back button).
            t.raycastTarget = false;
            t.textWrappingMode = TextWrappingModes.Normal;
            return t;
        }

        public static Button Button(string name, Transform parent, string text,
            Color bg, Color fg, float fontSize, out TextMeshProUGUI label)
        {
            var go = Node(name, parent);
            var img = go.AddComponent<Image>();
            img.color = bg;
            var sp = RoundedSprite();
            if (sp != null) { img.sprite = sp; img.type = Image.Type.Sliced; img.pixelsPerUnitMultiplier = 2.5f; }
            var btn = go.AddComponent<Button>();
            btn.targetGraphic = img;
            // Subtle press/hover feedback.
            var colors = btn.colors;
            colors.highlightedColor = new Color(1f, 1f, 1f, 1f);
            colors.pressedColor = new Color(0.9f, 0.9f, 0.9f, 1f);
            colors.fadeDuration = 0.08f;
            btn.colors = colors;

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
            label.raycastTarget = false; // let clicks pass through to the button Image
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
            var root = RoundedPanel(name, parent, PanelColor);
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
