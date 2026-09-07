import { ScrollView, Text, View, StyleSheet, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import ScreenContainer from "../../components/ScreenContainer";
import { listTeachers } from "../../lib/api/admin";
import { getPublishedCourses } from "../../lib/api/courses";
import { useAuth } from "../../context/AuthContext";
import { COLORS } from "../../constants/theme";

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  const teachersQuery = useQuery({ queryKey: ["admin-teachers"], queryFn: listTeachers });
  const coursesQuery = useQuery({ queryKey: ["published-courses"], queryFn: getPublishedCourses });

  const isLoading = teachersQuery.isLoading || coursesQuery.isLoading;

  return (
    <ScreenContainer title={`Hi, ${user?.name ?? "Admin"} 👋`}>
      <ScrollView contentContainerStyle={{ gap: 16 }}>
        <View style={styles.row}>
          <View style={[styles.statCard, { backgroundColor: "#f5f3ff" }]}>
            <Text style={[styles.statNumber, { color: "#7c3aed" }]}>
              {isLoading ? "—" : teachersQuery.data?.length ?? 0}
            </Text>
            <Text style={styles.statLabel}>Teachers</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#ecfdf5" }]}>
            <Text style={[styles.statNumber, { color: "#059669" }]}>
              {isLoading ? "—" : coursesQuery.data?.length ?? 0}
            </Text>
            <Text style={styles.statLabel}>Published Courses</Text>
          </View>
        </View>

        {isLoading && <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />}

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <Text style={styles.link} onPress={() => router.push("/(admin)/teachers")}>
          + Add a new teacher →
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 12 },
  statCard: { flex: 1, borderRadius: 16, padding: 20 },
  statNumber: { fontSize: 28, fontWeight: "800" },
  statLabel: { fontSize: 13, color: COLORS.muted, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text, marginTop: 8 },
  link: { color: COLORS.primary, fontWeight: "700", fontSize: 15 },
});