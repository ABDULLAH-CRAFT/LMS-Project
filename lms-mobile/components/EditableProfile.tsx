import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Share } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ScreenContainer from "./ScreenContainer";
import { useAuth } from "../context/AuthContext";
import { updateProfile, changePassword } from "../lib/api/users";
import { COLORS, CARD_SHADOW, PRIMARY_SHADOW } from "../constants/theme";

// Mock gamification stats — there's no streak/XP/level/hours-learned data in
// the backend yet, so these are placeholders to match the target design.
// Swap these for real query data once that feature exists.
const MOCK_STATS = {
  streakDays: 5,
  totalXp: 4850,
  level: 5,
  levelTitle: "Senior Token Crafter",
  currentLevelXp: 4250,
  nextLevelXp: 5000,
  hoursLearned: 84.5,
  coursesCompleted: 8,
};

export default function EditableProfile() {
  const { user, logout, updateUser } = useAuth();
  const router = useRouter();

  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [nameMessage, setNameMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const nameChanged = name.trim().length > 0 && name.trim() !== user?.name;
  const levelPercent = Math.round((MOCK_STATS.currentLevelXp / MOCK_STATS.nextLevelXp) * 100);

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

  async function handleShare() {
    try {
      await Share.share({ message: `Check out ${user?.name ?? "my"} profile on LMS! 🎓` });
    } catch {
      // user dismissed the share sheet — nothing to do
    }
  }

  return (
    <ScreenContainer title="Profile">
      {/* ===== Hero card ===== */}
      <View style={[styles.card, styles.heroCard]}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatarRing} />
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() ?? "?"}</Text>
          </View>
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark" size={12} color="#fff" />
          </View>
        </View>

        <View style={styles.nameRow}>
          <Text style={styles.name}>{user?.name ?? "Loading..."}</Text>
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>PRO</Text>
          </View>
        </View>
        <Text style={styles.tagline}>Lifelong Learner</Text>

        <View style={styles.chip}>
          <Ionicons name="school-outline" size={13} color={COLORS.mutedDark} />
          <Text style={styles.chipText}>{user?.role ?? "Student"} • LMS Member</Text>
        </View>

        <View style={styles.heroActions}>
          <Pressable style={styles.editProfileButton} onPress={() => setEditingName((v) => !v)}>
            <Ionicons name="pencil" size={14} color="#fff" />
            <Text style={styles.editProfileButtonText}>Edit Profile</Text>
          </Pressable>
          <Pressable style={styles.iconButton} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={18} color={COLORS.text} />
          </Pressable>
        </View>

        {editingName && (
          <View style={styles.inlineEdit}>
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
        )}
      </View>

      {/* ===== Stats row: streak + XP (mock data) ===== */}
      <View style={styles.statsRow}>
        <View style={[styles.card, styles.statCard]}>
          <View style={[styles.statIcon, { backgroundColor: COLORS.tertiaryLight }]}>
            <Ionicons name="flame" size={18} color={COLORS.tertiary} />
          </View>
          <Text style={styles.statValue}>{MOCK_STATS.streakDays} Days</Text>
          <Text style={styles.statLabel}>Active Streak</Text>
        </View>
        <View style={[styles.card, styles.statCard]}>
          <View style={[styles.statIcon, { backgroundColor: COLORS.primaryLight }]}>
            <Ionicons name="star" size={18} color={COLORS.primary} />
          </View>
          <Text style={styles.statValue}>{MOCK_STATS.totalXp.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Total XP</Text>
        </View>
      </View>

      {/* ===== Level progress (mock data) ===== */}
      <View style={[styles.card, styles.levelCard]}>
        <View style={styles.levelHeader}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>LVL {MOCK_STATS.level}</Text>
          </View>
          <Text style={styles.levelTitle}>{MOCK_STATS.levelTitle}</Text>
          <Text style={styles.levelPercent}>
            {levelPercent}% to Lvl {MOCK_STATS.level + 1}
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${levelPercent}%` }]} />
        </View>
        <View style={styles.levelFooter}>
          <Text style={styles.levelFooterText}>{MOCK_STATS.currentLevelXp.toLocaleString()} XP</Text>
          <Text style={styles.levelFooterText}>{MOCK_STATS.nextLevelXp.toLocaleString()} XP (Target)</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Learning Momentum</Text>

      {/* ===== Stats row: hours + courses completed (mock data) ===== */}
      <View style={styles.statsRow}>
        <View style={[styles.card, styles.statCard]}>
          <View style={[styles.statIcon, { backgroundColor: COLORS.surfaceStrong }]}>
            <Ionicons name="time-outline" size={18} color={COLORS.mutedDark} />
          </View>
          <Text style={styles.statValue}>{MOCK_STATS.hoursLearned} hrs</Text>
          <Text style={styles.statLabel}>Total Hours Learned</Text>
        </View>
        <View style={[styles.card, styles.statCard]}>
          <View style={[styles.statIcon, { backgroundColor: COLORS.successBg }]}>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
          </View>
          <Text style={styles.statValue}>{MOCK_STATS.coursesCompleted}</Text>
          <Text style={styles.statLabel}>Courses Completed</Text>
        </View>
      </View>

      {/* ===== Account settings ===== */}
      <Text style={styles.sectionTitle}>Account Settings</Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Email</Text>
        <Text style={styles.readonlyValue}>{user?.email}</Text>
        <Text style={[styles.cardLabel, { marginTop: 12 }]}>Role</Text>
        <Text style={styles.readonlyValue}>{user?.role}</Text>
      </View>

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

      {/* More — screens moved off the bottom bar */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>More</Text>
        {[
          { label: "Assignments", icon: "document-text" as const, route: "/(student)/assignments" },
          { label: "Messages", icon: "chatbubble-ellipses" as const, route: "/(student)/messages" },
          { label: "Settings", icon: "settings" as const, route: "/(student)/settings" },
        ].map((item, idx, arr) => (
          <Pressable
            key={item.route}
            style={[styles.menuRow, idx === arr.length - 1 && styles.menuRowLast]}
            onPress={() => router.push(item.route as any)}
          >
            <View style={styles.menuRowLeft}>
              <Ionicons name={item.icon} size={18} color={COLORS.text} />
              <Text style={styles.menuRowLabel}>{item.label}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.mutedDark} />
          </Pressable>
        ))}
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
    borderRadius: 20,
    padding: 16,
    gap: 10,
    marginBottom: 16,
    ...CARD_SHADOW,
  },

  // Hero card
  heroCard: { alignItems: "center", paddingVertical: 24 },
  avatarWrap: { width: 88, height: 88, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  avatarRing: {
    position: "absolute",
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: COLORS.primaryLight,
    borderStyle: "dashed",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    ...PRIMARY_SHADOW,
  },
  avatarText: { color: "#fff", fontSize: 26, fontWeight: "800" },
  verifiedBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.success,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { fontSize: 19, fontWeight: "800", color: COLORS.text },
  proBadge: { backgroundColor: COLORS.primary, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  proBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  tagline: { fontSize: 13, color: COLORS.muted, marginTop: 2, fontStyle: "italic" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.surfaceStrong,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 10,
  },
  chipText: { fontSize: 11, color: COLORS.mutedDark, textTransform: "capitalize" },
  heroActions: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16 },
  editProfileButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    ...PRIMARY_SHADOW,
  },
  editProfileButtonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.surfaceStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  inlineEdit: { width: "100%", marginTop: 18, gap: 10 },

  // Stats
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  statCard: { flex: 1, alignItems: "flex-start", marginBottom: 0 },
  statIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 17, fontWeight: "800", color: COLORS.text },
  statLabel: { fontSize: 11, color: COLORS.mutedDark },

  // Level card
  levelCard: { gap: 12 },
  levelHeader: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  levelBadge: { backgroundColor: COLORS.primaryLight, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  levelBadgeText: { color: COLORS.primary, fontWeight: "800", fontSize: 11 },
  levelTitle: { flex: 1, fontSize: 14, fontWeight: "700", color: COLORS.text },
  levelPercent: { fontSize: 12, color: COLORS.mutedDark, fontWeight: "600" },
  progressTrack: { height: 8, borderRadius: 999, backgroundColor: COLORS.surfaceStrong, overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 999, backgroundColor: COLORS.primary },
  levelFooter: { flexDirection: "row", justifyContent: "space-between" },
  levelFooterText: { fontSize: 11, color: COLORS.mutedDark },

  sectionTitle: { fontSize: 15, fontWeight: "700", color: COLORS.text, marginBottom: 12, marginTop: 2 },

  // Account settings (existing)
  cardTitle: { fontSize: 15, fontWeight: "700", color: COLORS.text },
  cardLabel: { fontSize: 11, color: COLORS.mutedDark, textTransform: "uppercase" },
  readonlyValue: { fontSize: 15, color: COLORS.text },
  input: {
    backgroundColor: COLORS.surfaceStrong,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: "#fff", fontWeight: "700" },
  success: { color: COLORS.success, fontSize: 12 },
  error: { color: COLORS.danger, fontSize: 12 },
  logoutButton: {
    backgroundColor: COLORS.danger,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuRowLast: { borderBottomWidth: 0 },
  menuRowLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  menuRowLabel: { fontSize: 14, color: COLORS.text },
});