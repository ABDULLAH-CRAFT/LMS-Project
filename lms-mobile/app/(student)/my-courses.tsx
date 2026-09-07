import { FlatList, Text, View, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import ScreenContainer from "../../components/ScreenContainer";
import { getMyEnrollments } from "../../lib/api/courses";
import { GRADIENTS, COLORS } from "../../constants/theme";

export default function MyCourses() {
  const router = useRouter();
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["my-enrollments"],
    queryFn: getMyEnrollments,
  });

  if (isLoading) {
    return (
      <ScreenContainer title="My Courses">
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      </ScreenContainer>
    );
  }

  if (isError) {
    return (
      <ScreenContainer title="My Courses">
        <Text style={styles.error}>Couldn't load your courses. Pull down to retry.</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer title="My Courses">
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 14 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListEmptyComponent={
          <Text style={styles.empty}>
            You haven't enrolled in any courses yet. Check the Browse tab.
          </Text>
        }
        renderItem={({ item, index }) => {
          const [start, end] = GRADIENTS[index % GRADIENTS.length];
          return (
            <LinearGradient
              colors={[start, end]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.card}
            >
              <Text style={styles.cardTitle}>{item.course.title}</Text>
              <Text style={styles.cardMeta}>Enrolled {new Date(item.enrolledAt).toLocaleDateString()}</Text>
              <Text
                style={styles.cardLink}
                onPress={() => router.push(`/(student)/course/${item.course.id}`)}
              >
                View Curriculum →
              </Text>
            </LinearGradient>
          );
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, padding: 20, gap: 6 },
  cardTitle: { color: "#fff", fontSize: 17, fontWeight: "800" },
  cardMeta: { color: "rgba(255,255,255,0.85)", fontSize: 12 },
  cardLink: { color: "#fff", fontWeight: "700", marginTop: 8 },
  empty: { color: COLORS.muted, fontSize: 14, textAlign: "center", marginTop: 40 },
  error: { color: COLORS.danger, fontSize: 13 },
});