import { router, Tabs } from "expo-router";
import { NotebookText, Search, Settings, Tag } from "lucide-react-native";
import { useWindowDimensions } from "react-native";
import { CmpButton } from "@/components/cmp/cmp-button";
import { strings } from "@/lib/strings";

// From this width the tabs become a labelled sidebar on the left.
const SIDEBAR_MIN_WIDTH = 768;

function SettingsButton() {
  return (
    <CmpButton
      variant="ghost"
      size="icon"
      icon={Settings}
      label={strings.list.settings}
      onPress={() => router.push("/settings")}
    />
  );
}

// title stays the app name (it's also the browser tab title on web);
// tabBarLabel and headerTitle name the tab.
export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const sidebar = width >= SIDEBAR_MIN_WIDTH;
  return (
    <Tabs
      screenOptions={{
        headerTitleAlign: "left",
        title: strings.appName,
        tabBarPosition: sidebar ? "left" : "bottom",
        tabBarVariant: sidebar ? "material" : "uikit",
      }}>
      <Tabs.Screen
        name="index"
        options={{
          headerTitle: strings.appName,
          headerRight: () => <SettingsButton />,
          // Lines the icon up with the content's 16px gutter (the ghost button
          // already adds 10px around the icon).
          headerRightContainerStyle: { paddingRight: 4 },
          tabBarLabel: strings.tabs.notes,
          tabBarIcon: ({ color, size }) => <NotebookText color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="tags"
        options={{
          headerTitle: strings.tabs.tags,
          tabBarLabel: strings.tabs.tags,
          tabBarIcon: ({ color, size }) => <Tag color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          headerTitle: strings.tabs.search,
          tabBarLabel: strings.tabs.search,
          tabBarIcon: ({ color, size }) => <Search color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
