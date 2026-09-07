import { FlatList, Text, View, StyleSheet, ActivityIndicator, Pressable, RefreshControl } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import ScreenContainer from "../../components/ScreenContainer";
import { getPublishedCourses, enrollInCourse } from "../../lib/api/courses";
import { COLORS } from "../../constants/theme";

export default function Browse() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["published-courses"],
    queryFn: getPublishedCourses,
  });

  const enrollMutation = useMutation({
    mutationFn: enrollInCourse,
    onSuccess: () => {
      // Refresh "My Courses" and dashboard stats since enrollment changed
      queryClient.invalidateQueries({ queryKey: ["my-enrollments"] });
    },
  });

  if (isLoading) {
    return (
      <ScreenContainer title="Browse Courses">
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      </ScreenContainer>
    );
  }

  if (isError) {
    return (
      <ScreenContainer title="Browse Courses">
        <Text style={styles.error}>Couldn't load courses. Pull down to retry.</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer title="Browse Courses">
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 12 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListEmptyComponent={<Text style={styles.empty}>No published courses yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Pressable onPress={() => router.push(`/(student)/course/${item.id}`)} style={{ flex: 1 }}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
              <Text style={styles.price}>₹{item.price}</Text>
            </Pressable>
            <Pressable
              style={styles.enrollButton}
              disabled={enrollMutation.isPending}
              onPress={() => enrollMutation.mutate(item.id)}
            >
              <Text style={styles.enrollText}>
                {enrollMutation.isPending && enrollMutation.variables === item.id ? "..." : "Enroll"}
              </Text>
            </Pressable>
          </View>
        )}
      />
      {enrollMutation.isError && (
        <Text style={styles.error}>
          {(enrollMutation.error as any)?.response?.data?.message ?? "Enrollment failed."}
        </Text>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  title: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  desc: { fontSize: 13, color: COLORS.muted },
  price: { fontSize: 14, fontWeight: "700", color: COLORS.primary },
  enrollButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 8,
  },
  enrollText: { color: "#fff", fontWeight: "700" },
  empty: { color: COLORS.muted, fontSize: 14, textAlign: "center", marginTop: 40 },
  error: { color: "#dc2626", fontSize: 13, marginTop: 8 },
});