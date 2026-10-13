import AsyncStorage from "@react-native-async-storage/async-storage";
import { colorScheme } from "nativewind";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemePref = "light" | "dark" | "system";

type Preferences = {
  ready: boolean;
  theme: ThemePref;
  setTheme: (theme: ThemePref) => void;
};

const THEME_KEY = "pref.theme";

const PreferencesContext = createContext<Preferences | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [theme, setThemeState] = useState<ThemePref>("system");

  useEffect(() => {
    void (async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_KEY);
        if (stored === "light" || stored === "dark" || stored === "system") {
          setThemeState(stored);
          colorScheme.set(stored);
        }
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setTheme = useCallback((next: ThemePref) => {
    setThemeState(next);
    colorScheme.set(next);
    void AsyncStorage.setItem(THEME_KEY, next);
  }, []);

  return (
    <PreferencesContext.Provider value={{ ready, theme, setTheme }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): Preferences {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error("usePreferences must be used inside PreferencesProvider");
  return value;
}
