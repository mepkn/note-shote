import { DarkTheme, DefaultTheme, type Theme } from "expo-router";

// Mirrors the CSS variables in global.css for React Navigation chrome.
export const THEME = {
  light: {
    background: "hsl(0 0% 100%)",
    foreground: "hsl(240 10% 4%)",
    card: "hsl(0 0% 100%)",
    primary: "hsl(212 60% 42%)", // --brand: tab tint and header accents
    border: "hsl(240 6% 90%)",
    muted: "hsl(240 4% 42%)",
    destructive: "hsl(0 72% 51%)",
  },
  dark: {
    background: "hsl(240 10% 4%)",
    foreground: "hsl(0 0% 98%)",
    card: "hsl(240 6% 8%)",
    primary: "hsl(210 85% 78%)",
    border: "hsl(240 4% 18%)",
    muted: "hsl(240 5% 65%)",
    destructive: "hsl(0 63% 50%)",
  },
};

export const NAV_THEME: Record<"light" | "dark", Theme> = {
  light: {
    ...DefaultTheme,
    colors: {
      background: THEME.light.background,
      border: THEME.light.border,
      card: THEME.light.card,
      notification: THEME.light.destructive,
      primary: THEME.light.primary,
      text: THEME.light.foreground,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      background: THEME.dark.background,
      border: THEME.dark.border,
      card: THEME.dark.card,
      notification: THEME.dark.destructive,
      primary: THEME.dark.primary,
      text: THEME.dark.foreground,
    },
  },
};
