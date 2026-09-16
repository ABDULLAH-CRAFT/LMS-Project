import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ROLE_ACCENTS, COLORS, SOFT_SHADOW } from "../../constants/theme";
import { useCart } from "../../context/CartContext";

export default function StudentLayout() {
  const { items } = useCart();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ROLE_ACCENTS.student,
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
        options={{ title: "Home", tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="my-courses"
        options={{ title: "Courses", tabBarIcon: ({ color, size }) => <Ionicons name="book" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="browse"
        options={{ title: "Browse", tabBarIcon: ({ color, size }) => <Ionicons name="compass" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Cart",
          tabBarIcon: ({ color, size }) => <Ionicons name="cart" color={color} size={size} />,
          tabBarBadge: items.length > 0 ? items.length : undefined,
          tabBarBadgeStyle: { backgroundColor: COLORS.danger, fontSize: 10 },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} /> }}
      />

      {/* Reachable via Profile screen links, hidden from the bottom bar */}
      <Tabs.Screen name="assignments" options={{ href: null }} />
      <Tabs.Screen name="messages" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="course/[id]" options={{ href: null }} />
      <Tabs.Screen name="payment" options={{ href: null }} />
    </Tabs>
  );
}
