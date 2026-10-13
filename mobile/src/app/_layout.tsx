import "@/global.css";

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { Stack, ThemeProvider } from "expo-router";
import Head from "expo-router/head";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { CmpPortalHost } from "@/components/cmp/cmp-portal-host";
import { convex, secureTokenStorage } from "@/lib/convex";
import { PreferencesProvider, usePreferences } from "@/lib/preferences";
import { strings } from "@/lib/strings";
import { NAV_THEME } from "@/lib/theme";

void SplashScreen.preventAutoHideAsync();

function RootStack() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { ready } = usePreferences();
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme === "dark" ? "dark" : "light";

  useEffect(() => {
    if (!isLoading && ready) void SplashScreen.hideAsync();
  }, [isLoading, ready]);

  if (isLoading || !ready) return null;

  return (
    <ThemeProvider value={NAV_THEME[scheme]}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={isAuthenticated}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
      <CmpPortalHost />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Static default for the web tab; screens' titles replace it once mounted. */}
      <Head>
        <title>{strings.appName}</title>
      </Head>
      <KeyboardProvider>
        <ConvexAuthProvider client={convex} storage={secureTokenStorage}>
          <PreferencesProvider>
            <RootStack />
          </PreferencesProvider>
        </ConvexAuthProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
