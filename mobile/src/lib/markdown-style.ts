import type { MarkdownStyle } from "react-native-enriched-markdown";

// Hex values mirroring global.css; the native renderer doesn't parse hsl().
const PALETTE = {
  light: {
    text: "#09090B",
    muted: "#64646E",
    link: "#2B6BAE",
    border: "#E4E4E7",
    surface: "#F4F4F5",
    code: "#B4235A",
  },
  dark: {
    text: "#FAFAFA",
    muted: "#A1A1AA",
    link: "#9CCAF7",
    border: "#2E2E33",
    surface: "#18181B",
    code: "#F7A1BE",
  },
};

export function markdownStyle(scheme: "light" | "dark"): MarkdownStyle {
  const c = PALETTE[scheme];
  const heading = { color: c.text };
  return {
    paragraph: { color: c.text, fontSize: 16, lineHeight: 24 },
    h1: heading,
    h2: heading,
    h3: heading,
    h4: heading,
    h5: heading,
    h6: heading,
    list: { color: c.text, fontSize: 16, lineHeight: 24, bulletColor: c.muted, markerColor: c.muted },
    link: { color: c.link, underline: true },
    strong: { color: c.text, fontWeight: "bold" },
    em: { color: c.text, fontStyle: "italic" },
    code: { color: c.code, backgroundColor: c.surface, borderColor: c.border },
    codeBlock: { color: c.text, backgroundColor: c.surface, borderColor: c.border, borderRadius: 8 },
    blockquote: { color: c.muted, borderColor: c.border, backgroundColor: c.surface },
    thematicBreak: { color: c.border },
    table: {
      color: c.text,
      borderColor: c.border,
      headerBackgroundColor: c.surface,
      headerTextColor: c.text,
      rowEvenBackgroundColor: "transparent",
      rowOddBackgroundColor: c.surface,
    },
    taskList: { borderColor: c.muted, checkedColor: c.link },
  };
}

export const editorColors = PALETTE;
