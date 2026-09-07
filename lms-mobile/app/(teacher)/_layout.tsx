import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ROLE_ACCENTS } from "../../constants/theme";

export default function TeacherLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ROLE_ACCENTS.teacher,
        tabBarInactiveTintColor: "#9ca3af",
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