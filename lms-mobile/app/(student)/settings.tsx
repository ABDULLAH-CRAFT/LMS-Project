import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Switch, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ScreenContainer from "../../components/ScreenContainer";
import { COLORS } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import {
  getNotificationSettings,
  updateNotificationSettings,
  NotificationSettings,
} from "../../lib/api/notificationsettings";

const SETTINGS_QUERY_KEY = ["notification-settings"];

const TOGGLES: { key: keyof NotificationSettings; label: string; description: string }[] = [
  { key: "courseUpdates", label: "Course updates", description: "New lessons added to courses you're enrolled in" },
  { key: "enrollmentConfirmations", label: "Enrollment confirmations", description: "Confirmation when you enroll in a course" },
  { key: "marketingEmails", label: "Marketing emails", description: "Occasional updates about new features and courses" },
];

export default function Settings() {
  const router = useRouter();
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: getNotificationSettings,
  });

  const mutation = useMutation({
    mutationFn: (patch: Partial<NotificationSettings>) => updateNotificationSettings(patch),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: SETTINGS_QUERY_KEY });
      const previous = queryClient.getQueryData<NotificationSettings>(SETTINGS_QUERY_KEY);
      if (previous) {
        queryClient.setQueryData<NotificationSettings>(SETTINGS_QUERY_KEY, { ...previous, ...patch });
      }
      return { previous };
    },
    onError: (_err, _patch, context) => {
      if (context?.previous) queryClient.setQueryData(SETTINGS_QUERY_KEY, context.previous);
    },
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY }),
  });

  const toggle = (key: keyof NotificationSettings) => {
    if (!settings) return;
    mutation.mutate({ [key]: !settings[key] });
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  if (isLoading || !settings) {
    return (
      <ScreenContainer title="Settings" showBack>
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer title="Settings" showBack>
      <Text style={styles.subtitle}>Manage your notification preferences and account.</Text>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Notifications</Text>
          {saved && <Text style={styles.saved}>Saved</Text>}
        </View>

        {TOGGLES.map((item, idx) => (
          <View key={item.key} style={[styles.row, idx === TOGGLES.length - 1 && styles.rowLast]}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>{item.label}</Text>
              <Text style={styles.rowDescription}>{item.description}</Text>
            </View>
            <Switch
              value={settings[item.key]}
              onValueChange={() => toggle(item.key)}
              trackColor={{ false: COLORS.surface, true: COLORS.primaryStrong }}
              thumbColor={COLORS.text}
            />
          </View>
        ))}
      </View>

      <View style={[styles.card, styles.dangerCard]}>
        <Text style={styles.cardTitle}>Account</Text>
        <Text style={styles.dangerHint}>Manage your session on this device.</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  subtitle: { color: COLORS.mutedDark, marginBottom: 20, fontSize: 13 },
  card: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 18, marginBottom: 16 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardTitle: { color: COLORS.text, fontWeight: "600", fontSize: 15 },
  saved: { color: COLORS.success, fontSize: 12 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowLast: { borderBottomWidth: 0 },
  rowText: { flex: 1, paddingRight: 12 },
  rowLabel: { color: COLORS.text, fontSize: 14 },
  rowDescription: { color: COLORS.mutedDark, fontSize: 12, marginTop: 2 },
  dangerCard: { borderColor: "rgba(248,113,113,0.2)" },
  dangerHint: { color: COLORS.mutedDark, fontSize: 12, marginBottom: 14 },
  logoutBtn: { alignSelf: "flex-start", borderWidth: 1, borderColor: "rgba(248,113,113,0.3)", borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16 },
  logoutText: { color: COLORS.danger, fontSize: 13, fontWeight: "500" },
});