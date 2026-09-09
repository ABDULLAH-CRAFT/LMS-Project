import { Text, View, StyleSheet, ActivityIndicator, ScrollView, RefreshControl } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import ScreenContainer from "../../components/ScreenContainer";
import { getMyEnrollments } from "../../lib/api/courses";
import { useAuth } from "../../context/AuthContext";
import { COLORS } from "../../constants/theme";

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
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
      >
        <View style={styles.row}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{isLoading ? "—" : enrollments?.length ?? 0}</Text>
            <Text style={styles.statLabel}>Enrolled Courses</Text>
          </View>
        </View>

        {isLoading && <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />}
        {isError && <Text style={styles.error}>Couldn't load your dashboard. Pull down to retry.</Text>}

        <Text style={styles.sectionTitle}>Continue Learning</Text>
        {enrollments && enrollments.length === 0 && (
          <Text style={styles.empty}>You're not enrolled in any courses yet.</Text>
        )}
        {enrollments?.slice(0, 3).map((enrollment) => (
          <View key={enrollment.id} style={styles.courseRow}>
            <Text style={styles.courseTitle}>{enrollment.course.title}</Text>
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
  row: { flexDirection: "row", gap: 12 },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statNumber: { fontSize: 28, fontWeight: "800", color: COLORS.primary },
  statLabel: { fontSize: 13, color: COLORS.muted, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text, marginTop: 8 },
  empty: { color: COLORS.muted, fontSize: 14 },
  courseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
  },
  courseTitle: { fontSize: 15, fontWeight: "600", color: COLORS.text, flex: 1 },
  link: { color: COLORS.primary, fontWeight: "700" },
  error: { color: COLORS.danger, fontSize: 13 },
});