import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ROLE_ACCENTS, COLORS, SOFT_SHADOW } from "../../constants/theme";

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ROLE_ACCENTS.admin,
        tabBarInactiveTintColor: COLORS.mutedDark,
        tabBarStyle: {
          backgroundColor: COLORS.background,
          borderTopWidth: 0,
          height: 78,
          paddingTop: 8,
          paddingBottom: 18,
          ...SOFT_SHADOW,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: "Dashboard", tabBarIcon: ({ color, size }) => <Ionicons name="grid" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="teachers"
        options={{ title: "Teachers", tabBarIcon: ({ color, size }) => <Ionicons name="people" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} /> }}
      />
    </Tabs>
  );
}
