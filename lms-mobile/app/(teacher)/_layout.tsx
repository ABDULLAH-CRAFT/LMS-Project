import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ROLE_ACCENTS, COLORS, SOFT_SHADOW } from "../../constants/theme";

export default function TeacherLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ROLE_ACCENTS.teacher,
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
        options={{ title: "Dashboard", tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="drafts"
        options={{ title: "Drafts", tabBarIcon: ({ color, size }) => <Ionicons name="create" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="published"
        options={{ title: "Published", tabBarIcon: ({ color, size }) => <Ionicons name="checkmark-done" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} /> }}
      />
      <Tabs.Screen name="course/[id]" options={{ href: null }} />
    </Tabs>
  );
}
