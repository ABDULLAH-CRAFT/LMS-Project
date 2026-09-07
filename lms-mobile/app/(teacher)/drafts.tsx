import { FlatList, Text, View, StyleSheet, ActivityIndicator, RefreshControl, Pressable } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import ScreenContainer from "../../components/ScreenContainer";
import { getMyTeacherCourses } from "../../lib/api/courses";
import { CourseStatus } from "../../types/course";
import { COLORS } from "../../constants/theme";

export default function Drafts() {
  const router = useRouter();
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["my-teacher-courses"],
    queryFn: getMyTeacherCourses,
  });

  const drafts = data?.filter((c) => c.status === CourseStatus.DRAFT) ?? [];

  if (isLoading) {
    return (
      <ScreenContainer title="Drafts">
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      </ScreenContainer>
    );
  }

  if (isError) {
    return (
      <ScreenContainer title="Drafts">
        <Text style={styles.error}>Couldn't load drafts. Pull down to retry.</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer title="Drafts">
      <FlatList
        data={drafts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 12 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListEmptyComponent={<Text style={styles.empty}>No drafts. Create one from the Dashboard tab.</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/(teacher)/course/${item.id}`)}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>DRAFT</Text>
            </View>
          </Pressable>
        )}
      />
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
    gap: 6,
  },
  title: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  desc: { fontSize: 13, color: COLORS.muted },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.warningBg,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },
  badgeText: { color: COLORS.warning, fontSize: 11, fontWeight: "700" },
  empty: { color: COLORS.muted, fontSize: 14, textAlign: "center", marginTop: 40 },
  error: { color: COLORS.danger, fontSize: 13 },
});