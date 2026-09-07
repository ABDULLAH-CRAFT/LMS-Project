import { FlatList, Text, View, StyleSheet, ActivityIndicator, RefreshControl, Pressable } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import ScreenContainer from "../../components/ScreenContainer";
import { getMyTeacherCourses } from "../../lib/api/courses";
import { CourseStatus } from "../../types/course";
import { COLORS } from "../../constants/theme";

export default function Published() {
  const router = useRouter();
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["my-teacher-courses"],
    queryFn: getMyTeacherCourses,
  });

  const published = data?.filter((c) => c.status === CourseStatus.PUBLISHED) ?? [];

  if (isLoading) {
    return (
      <ScreenContainer title="Published">
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      </ScreenContainer>
    );
  }

  if (isError) {
    return (
      <ScreenContainer title="Published">
        <Text style={styles.error}>Couldn't load courses. Pull down to retry.</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer title="Published">
      <FlatList
        data={published}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 12 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListEmptyComponent={<Text style={styles.empty}>Nothing published yet.</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/(teacher)/course/${item.id}`)}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
            <Text style={styles.price}>₹{item.price}</Text>
            <View style={[styles.badge, { backgroundColor: "#d1fae5" }]}>
              <Text style={[styles.badgeText, { color: "#059669" }]}>PUBLISHED</Text>
            </View>
          </Pressable>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 16, gap: 6 },
  title: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  desc: { fontSize: 13, color: COLORS.muted },
  price: { fontSize: 14, fontWeight: "700", color: COLORS.primary },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
  empty: { color: COLORS.muted, fontSize: 14, textAlign: "center", marginTop: 40 },
  error: { color: "#dc2626", fontSize: 13 },
});