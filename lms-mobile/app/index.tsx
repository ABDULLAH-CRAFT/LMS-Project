import { View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { UserRole } from "../types/user";
import { COLORS } from "../constants/theme";

export default function Index() {
  const { isLoading, isAuthenticated, user } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!isAuthenticated || !user) {
    return <Redirect href="/(auth)/login" />;
  }

  switch (user.role) {
    case UserRole.ADMIN:
      return <Redirect href="/(admin)/dashboard" />;
    case UserRole.TEACHER:
      return <Redirect href="/(teacher)/dashboard" />;
    case UserRole.STUDENT:
    default:
      return <Redirect href="/(student)/dashboard" />;
  }
}