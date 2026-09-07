import { ScrollView, Text, View, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCourseById, getCurriculum, checkEnrollment, enrollInCourse } from "../../../lib/api/courses";
import { COLORS } from "../../../constants/theme";

export default function CourseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const courseQuery = useQuery({
    queryKey: ["course", id],
    queryFn: () => getCourseById(id),
    enabled: !!id,
  });

  const enrollmentQuery = useQuery({
    queryKey: ["enrollment-check", id],
    queryFn: () => checkEnrollment(id),
    enabled: !!id,
  });

  const curriculumQuery = useQuery({
    queryKey: ["curriculum", id],
    queryFn: () => getCurriculum(id),
    enabled: !!id && enrollmentQuery.data === true, // only load lessons once enrolled
  });

  const enrollMutation = useMutation({
    mutationFn: () => enrollInCourse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollment-check", id] });
      queryClient.invalidateQueries({ queryKey: ["my-enrollments"] });
    },
  });

  if (courseQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (courseQuery.isError || !courseQuery.data) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Course not found.</Text>
      </View>
    );
  }

  const course = courseQuery.data;
  const isEnrolled = enrollmentQuery.data === true;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: COLORS.background }} contentContainerStyle={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: course.title,
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.text,
        }}
      />

      <Text style={styles.title}>{course.title}</Text>
      <Text style={styles.desc}>{course.description}</Text>
      <Text style={styles.price}>₹{course.price}</Text>

      {!isEnrolled && (
        <Pressable
          style={styles.enrollButton}
          disabled={enrollMutation.isPending}
          onPress={() => enrollMutation.mutate()}
        >
          <Text style={styles.enrollText}>
            {enrollMutation.isPending ? "Enrolling..." : "Enroll in this Course"}
          </Text>
        </Pressable>
      )}

      {isEnrolled && (
        <View style={{ marginTop: 20 }}>
          <Text style={styles.sectionTitle}>Curriculum</Text>
          {curriculumQuery.isLoading && <ActivityIndicator color={COLORS.primary} />}
          {curriculumQuery.data?.length === 0 && (
            <Text style={styles.empty}>The teacher hasn't added any content yet.</Text>
          )}
          {curriculumQuery.data?.map((module) => (
            <View key={module.id} style={styles.module}>
              <Text style={styles.moduleTitle}>{module.title}</Text>
              {module.lessons.map((lesson) => (
                <View key={lesson.id} style={styles.lessonRow}>
                  <Text style={styles.lessonIcon}>{lesson.contentType === "video" ? "▶" : "📄"}</Text>
                  <Text style={styles.lessonTitle}>{lesson.title}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "800", color: COLORS.text },
  desc: { fontSize: 14, color: COLORS.muted, marginTop: 4 },
  price: { fontSize: 18, fontWeight: "700", color: COLORS.primary, marginTop: 8 },
  enrollButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  enrollText: { color: "#fff", fontWeight: "700" },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: COLORS.text, marginBottom: 10 },
  empty: { color: COLORS.muted, fontSize: 14 },
  module: { marginBottom: 16 },
  moduleTitle: { fontSize: 15, fontWeight: "700", color: COLORS.text, marginBottom: 6 },
  lessonRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6, paddingLeft: 8 },
  lessonIcon: { fontSize: 14 },
  lessonTitle: { fontSize: 14, color: COLORS.text },
  error: { color: COLORS.danger, fontSize: 14 },
});