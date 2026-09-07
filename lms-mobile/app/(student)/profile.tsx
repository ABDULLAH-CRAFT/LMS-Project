import { Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import ScreenContainer from "../../components/ScreenContainer";
import { useAuth } from "../../context/AuthContext";
import { COLORS } from "../../constants/theme";

export default function StudentProfile() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  return (
    <ScreenContainer title="Profile">
      <Text style={styles.label}>Name: {user?.name}</Text>
      <Text style={styles.label}>Email: {user?.email}</Text>
      <Text style={styles.label}>Role: {user?.role}</Text>
      <Pressable style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Log Out</Text>
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 15, color: COLORS.text, marginBottom: 8 },
  button: {
    backgroundColor: "#dc2626",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: { color: "#fff", fontWeight: "700" },
});