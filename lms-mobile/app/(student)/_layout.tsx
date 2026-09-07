import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ROLE_ACCENTS } from "../../constants/theme";

export default function StudentLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ROLE_ACCENTS.student,
        tabBarInactiveTintColor: "#9ca3af",
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: "Dashboard", tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="my-courses"
        options={{ title: "My Courses", tabBarIcon: ({ color, size }) => <Ionicons name="book" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="browse"
        options={{ title: "Browse", tabBarIcon: ({ color, size }) => <Ionicons name="compass" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} /> }}
      />
      {/* course/[id] is a stack screen reached via router.push, hidden from the tab bar */}
      <Tabs.Screen name="course/[id]" options={{ href: null }} />
    </Tabs>
  );
}