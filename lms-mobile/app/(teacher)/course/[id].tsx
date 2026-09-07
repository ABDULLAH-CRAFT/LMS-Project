import { useState } from "react";
import { ScrollView, Text, View, TextInput, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCourseById,
  getCurriculum,
  publishCourse,
  createModule,
  createLesson,
} from "../../../lib/api/courses";
import { CourseStatus, LessonContentType } from "../../../types/course";
import { COLORS } from "../../../constants/theme";

export default function CourseEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [moduleTitle, setModuleTitle] = useState("");
  const [addingLessonToModuleId, setAddingLessonToModuleId] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonContent, setLessonContent] = useState("");
  const [lessonType, setLessonType] = useState<LessonContentType>(LessonContentType.TEXT);

  const courseQuery = useQuery({
    queryKey: ["course", id],
    queryFn: () => getCourseById(id),
    enabled: !!id,
  });

  const curriculumQuery = useQuery({
    queryKey: ["curriculum", id],
    queryFn: () => getCurriculum(id),
    enabled: !!id,
  });

  const publishMutation = useMutation({
    mutationFn: () => publishCourse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course", id] });
      queryClient.invalidateQueries({ queryKey: ["my-teacher-courses"] });
    },
  });

  const addModuleMutation = useMutation({
    mutationFn: () => createModule(id, { title: moduleTitle.trim() }),
    onSuccess: () => {
      setModuleTitle("");
      queryClient.invalidateQueries({ queryKey: ["curriculum", id] });
    },
  });

  const addLessonMutation = useMutation({
    mutationFn: (moduleId: string) =>
      createLesson(id, moduleId, {
        title: lessonTitle.trim(),
        contentType: lessonType,
        content: lessonContent.trim(),
      }),
    onSuccess: () => {
      setLessonTitle("");
      setLessonContent("");
      setAddingLessonToModuleId(null);
      queryClient.invalidateQueries({ queryKey: ["curriculum", id] });
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
  const isDraft = course.status === CourseStatus.DRAFT;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#fff" }} contentContainerStyle={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: course.title }} />

      <Text style={styles.title}>{course.title}</Text>
      <Text style={styles.desc}>{course.description}</Text>
      <Text style={styles.price}>₹{course.price}</Text>

      <View style={[styles.badge, isDraft ? styles.draftBadge : styles.publishedBadge]}>
        <Text style={isDraft ? styles.draftText : styles.publishedText}>
          {isDraft ? "DRAFT" : "PUBLISHED"}
        </Text>
      </View>

      {isDraft && (
        <Pressable
          style={styles.publishButton}
          disabled={publishMutation.isPending}
          onPress={() => publishMutation.mutate()}
        >
          {publishMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.publishButtonText}>Publish Course</Text>
          )}
        </Pressable>
      )}

      <Text style={styles.sectionTitle}>Curriculum</Text>

      {curriculumQuery.data?.map((module) => (
        <View key={module.id} style={styles.module}>
          <Text style={styles.moduleTitle}>{module.title}</Text>
          {module.lessons.map((lesson) => (
            <View key={lesson.id} style={styles.lessonRow}>
              <Text style={styles.lessonIcon}>{lesson.contentType === "video" ? "▶" : "📄"}</Text>
              <Text style={styles.lessonTitle}>{lesson.title}</Text>
            </View>
          ))}

          {addingLessonToModuleId === module.id ? (
            <View style={styles.lessonForm}>
              <TextInput
                style={styles.input}
                placeholder="Lesson title"
                value={lessonTitle}
                onChangeText={setLessonTitle}
              />
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable
                  style={[styles.typeChip, lessonType === "text" && styles.typeChipActive]}
                  onPress={() => setLessonType(LessonContentType.TEXT)}
                >
                  <Text style={lessonType === "text" ? styles.typeChipTextActive : styles.typeChipText}>Text</Text>
                </Pressable>
                <Pressable
                  style={[styles.typeChip, lessonType === "video" && styles.typeChipActive]}
                  onPress={() => setLessonType(LessonContentType.VIDEO)}
                >
                  <Text style={lessonType === "video" ? styles.typeChipTextActive : styles.typeChipText}>Video</Text>
                </Pressable>
              </View>
              <TextInput
                style={[styles.input, { height: 70, textAlignVertical: "top" }]}
                placeholder={lessonType === "video" ? "Video URL" : "Lesson text"}
                multiline
                value={lessonContent}
                onChangeText={setLessonContent}
              />
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable
                  style={[styles.smallButton, { flex: 1 }]}
                  disabled={addLessonMutation.isPending}
                  onPress={() => addLessonMutation.mutate(module.id)}
                >
                  <Text style={styles.smallButtonText}>
                    {addLessonMutation.isPending ? "Adding..." : "Add Lesson"}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.smallButton, { flex: 1, backgroundColor: "#9ca3af" }]}
                  onPress={() => setAddingLessonToModuleId(null)}
                >
                  <Text style={styles.smallButtonText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable onPress={() => setAddingLessonToModuleId(module.id)}>
              <Text style={styles.addLessonLink}>+ Add Lesson</Text>
            </Pressable>
          )}
        </View>
      ))}

      <View style={styles.moduleForm}>
        <TextInput
          style={styles.input}
          placeholder="New module title (e.g. Getting Started)"
          value={moduleTitle}
          onChangeText={setModuleTitle}
        />
        <Pressable
          style={styles.smallButton}
          disabled={addModuleMutation.isPending || moduleTitle.trim().length < 3}
          onPress={() => addModuleMutation.mutate()}
        >
          <Text style={styles.smallButtonText}>
            {addModuleMutation.isPending ? "Adding..." : "+ Add Module"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 8, paddingBottom: 60 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "800", color: COLORS.text },
  desc: { fontSize: 14, color: COLORS.muted, marginTop: 4 },
  price: { fontSize: 18, fontWeight: "700", color: COLORS.primary, marginTop: 8 },
  badge: { alignSelf: "flex-start", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8 },
  draftBadge: { backgroundColor: "#fef3c7" },
  publishedBadge: { backgroundColor: "#d1fae5" },
  draftText: { color: "#d97706", fontSize: 11, fontWeight: "700" },
  publishedText: { color: "#059669", fontSize: 11, fontWeight: "700" },
  publishButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  publishButtonText: { color: "#fff", fontWeight: "700" },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: COLORS.text, marginTop: 24, marginBottom: 10 },
  module: { marginBottom: 18, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 14 },
  moduleTitle: { fontSize: 15, fontWeight: "700", color: COLORS.text, marginBottom: 6 },
  lessonRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6, paddingLeft: 8 },
  lessonIcon: { fontSize: 14 },
  lessonTitle: { fontSize: 14, color: COLORS.text },
  addLessonLink: { color: COLORS.primary, fontWeight: "600", marginTop: 8, fontSize: 13 },
  lessonForm: { marginTop: 10, gap: 8 },
  moduleForm: { gap: 8, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  smallButton: { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  smallButtonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  typeChip: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  typeChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeChipText: { fontSize: 13, color: COLORS.text },
  typeChipTextActive: { fontSize: 13, color: "#fff", fontWeight: "700" },
  error: { color: "#dc2626", fontSize: 14 },
});