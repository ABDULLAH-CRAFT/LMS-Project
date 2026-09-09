import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import ScreenContainer from "./ScreenContainer";
import { useAuth } from "../context/AuthContext";
import { updateProfile, changePassword } from "../lib/api/users";
import { COLORS } from "../constants/theme";

export default function EditableProfile() {
  const { user, logout, updateUser } = useAuth();
  const router = useRouter();

  const [name, setName] = useState(user?.name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [nameMessage, setNameMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const nameChanged = name.trim().length > 0 && name.trim() !== user?.name;

  async function handleSaveName() {
    setNameMessage(null);
    setSavingName(true);
    try {
      const updated = await updateProfile(name.trim());
      updateUser(updated);
      setNameMessage({ type: "success", text: "Name updated." });
    } catch (err: any) {
      const message = err?.response?.data?.message ?? "Couldn't update name. Try again.";
      setNameMessage({ type: "error", text: Array.isArray(message) ? message[0] : message });
    } finally {
      setSavingName(false);
    }
  }

  async function handleChangePassword() {
    setPasswordMessage(null);

    if (newPassword.length < 6) {
      setPasswordMessage({ type: "error", text: "New password must be at least 6 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "New passwords don't match." });
      return;
    }

    setSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordMessage({ type: "success", text: "Password changed." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      const message = err?.response?.data?.message ?? "Couldn't change password. Try again.";
      setPasswordMessage({ type: "error", text: Array.isArray(message) ? message[0] : message });
    } finally {
      setSavingPassword(false);
    }
  }

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  return (
    <ScreenContainer title="Profile">
      {/* Read-only account info */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Email</Text>
        <Text style={styles.readonlyValue}>{user?.email}</Text>
        <Text style={[styles.cardLabel, { marginTop: 12 }]}>Role</Text>
        <Text style={styles.readonlyValue}>{user?.role}</Text>
      </View>

      {/* Edit name */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={COLORS.placeholder}
        />
        {nameMessage && (
          <Text style={nameMessage.type === "success" ? styles.success : styles.error}>{nameMessage.text}</Text>
        )}
        <Pressable
          style={[styles.button, !nameChanged && styles.buttonDisabled]}
          disabled={!nameChanged || savingName}
          onPress={handleSaveName}
        >
          {savingName ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save Name</Text>}
        </Pressable>
      </View>

      {/* Change password */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Change Password</Text>
        <TextInput
          style={styles.input}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Current password"
          placeholderTextColor={COLORS.placeholder}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="New password"
          placeholderTextColor={COLORS.placeholder}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm new password"
          placeholderTextColor={COLORS.placeholder}
          secureTextEntry
        />
        {passwordMessage && (
          <Text style={passwordMessage.type === "success" ? styles.success : styles.error}>
            {passwordMessage.text}
          </Text>
        )}
        <Pressable
          style={[styles.button, !currentPassword && styles.buttonDisabled]}
          disabled={!currentPassword || savingPassword}
          onPress={handleChangePassword}
        >
          {savingPassword ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Change Password</Text>}
        </Pressable>
      </View>

      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.buttonText}>Log Out</Text>
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: COLORS.text },
  cardLabel: { fontSize: 11, color: COLORS.mutedDark, textTransform: "uppercase" },
  readonlyValue: { fontSize: 15, color: COLORS.text },
  input: {
    backgroundColor: COLORS.surfaceStrong,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: "#fff", fontWeight: "700" },
  success: { color: COLORS.success, fontSize: 12 },
  error: { color: COLORS.danger, fontSize: 12 },
  logoutButton: {
    backgroundColor: COLORS.danger,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
});