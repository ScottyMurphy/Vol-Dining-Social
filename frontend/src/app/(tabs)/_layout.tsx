import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../lib/theme";

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(name: IconName) {
  const TabIcon = ({ color, size }: { color: unknown; size: number }) => (
    <Ionicons name={name} size={size} color={typeof color === "string" ? color : "#6B6B73"} />
  );
  return TabIcon;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.orangeText,
        tabBarInactiveTintColor: "#6B6B73",
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: COLORS.border,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Home", tabBarIcon: tabIcon("home-outline") }}
      />
      <Tabs.Screen
        name="dining"
        options={{ title: "Dining", tabBarIcon: tabIcon("restaurant-outline") }}
      />
      <Tabs.Screen
        name="community"
        options={{ title: "Community", tabBarIcon: tabIcon("chatbubbles-outline") }}
      />
      <Tabs.Screen
        name="preferences"
        options={{ title: "Preferences", tabBarIcon: tabIcon("options-outline") }}
      />
    </Tabs>
  );
}
