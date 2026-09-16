import { Text, View, StyleSheet, ActivityIndicator, ScrollView, RefreshControl } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import ScreenContainer from "../../components/ScreenContainer";
import { getMyEnrollments } from "../../lib/api/courses";
import { useAuth } from "../../context/AuthContext";
import { COLORS, SOFT_SHADOW, PRIMARY_SHADOW } from "../../constants/theme";

export default function StudentDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  const { data: enrollments, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["my-enrollments"],
    queryFn: getMyEnrollments,
  });

  return (
    <ScreenContainer title={`Hi, ${user?.name?.split(" ")[0] ?? "there"} 👋`}>
      <ScrollView
        contentContainerStyle={{ gap: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
      >
        <Text style={styles.greetingSub}>Ready to achieve your daily targets?</Text>

        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Enrolled Courses</Text>
          <Text style={styles.heroNumber}>{isLoading ? "—" : enrollments?.length ?? 0}</Text>
          <Text style={styles.heroHint}>Keep the momentum going — open a course below to continue.</Text>
        </View>

        {isLoading && <ActivityIndicator color={COLORS.primary} style={{ marginTop: 4 }} />}
        {isError && <Text style={styles.error}>Couldn't load your dashboard. Pull down to retry.</Text>}

        <Text style={styles.sectionTitle}>Continue Learning</Text>
        {enrollments && enrollments.length === 0 && (
          <Text style={styles.empty}>You're not enrolled in any courses yet.</Text>
        )}
        {enrollments?.slice(0, 3).map((enrollment) => (
          <View key={enrollment.id} style={styles.courseRow}>
            <Text style={styles.courseTitle} numberOfLines={1}>{enrollment.course.title}</Text>
            <Text
              style={styles.link}
              onPress={() => router.push(`/(student)/course/${enrollment.course.id}`)}
            >
              Open →
            </Text>
          </View>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  greetingSub: { fontSize: 13, color: COLORS.muted, marginTop: -8 },
  heroCard: {
    borderRadius: 24,
    padding: 22,
    backgroundColor: COLORS.primary,
    ...PRIMARY_SHADOW,
  },
  heroLabel: { fontSize: 12, fontWeight: "700", color: COLORS.primaryLight, textTransform: "uppercase", letterSpacing: 0.6 },
  heroNumber: { fontSize: 40, fontWeight: "800", color: "#fff", marginTop: 6, letterSpacing: -1 },
  heroHint: { fontSize: 13, color: COLORS.primaryLight, marginTop: 8, lineHeight: 18 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text, marginTop: 8 },
  empty: { color: COLORS.muted, fontSize: 14 },
  courseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    ...SOFT_SHADOW,
  },
  courseTitle: { fontSize: 15, fontWeight: "700", color: COLORS.text, flex: 1, marginRight: 12 },
  link: { color: COLORS.primary, fontWeight: "700" },
  error: { color: COLORS.danger, fontSize: 13 },
});
