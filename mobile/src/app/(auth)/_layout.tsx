import { Stack } from "expo-router";
import { strings } from "@/lib/strings";

export default function AuthLayout() {
  // title sets the browser tab title on web.
  return <Stack screenOptions={{ headerShown: false, animation: "fade", title: strings.appName }} />;
}
