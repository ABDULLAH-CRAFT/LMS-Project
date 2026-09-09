import { useState } from "react";
import { ScrollView, Text, View, TextInput, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import ScreenContainer from "../../components/ScreenContainer";
import { getMyTeacherCourses, createCourse } from "../../lib/api/courses";
import { CourseStatus } from "../../types/course";
import { useAuth } from "../../context/AuthContext";
import { COLORS } from "../../constants/theme";

export default function TeacherDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: courses, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["my-teacher-courses"],
    queryFn: getMyTeacherCourses,
  });

  const createMutation = useMutation({
    mutationFn: createCourse,
    onSuccess: (newCourse) => {
      queryClient.invalidateQueries({ queryKey: ["my-teacher-courses"] });
      setShowForm(false);
      setTitle("");
      setDescription("");
      setPrice("");
      router.push(`/(teacher)/course/${newCourse.id}`); // jump straight into the editor to add content
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message ?? "Could not create course.";
      setError(Array.isArray(message) ? message[0] : message);
    },
  });

  const draftCount = courses?.filter((c) => c.status === CourseStatus.DRAFT).length ?? 0;
  const publishedCount = courses?.filter((c) => c.status === CourseStatus.PUBLISHED).length ?? 0;

  const handleCreate = () => {
    setError(null);
    const parsedPrice = parseFloat(price);
    if (title.trim().length < 3) return setError("Title must be at least 3 characters.");
    if (description.trim().length < 10) return setError("Description must be at least 10 characters.");
    if (isNaN(parsedPrice) || parsedPrice < 0) return setError("Enter a valid price.");
    createMutation.mutate({ title: title.trim(), description: description.trim(), price: parsedPrice });
  };

  return (
    <ScreenContainer title={`Hi, ${user?.name?.split(" ")[0] ?? "Teacher"} 👋`}>
      <ScrollView
        contentContainerStyle={{ gap: 16 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
      >
        <View style={styles.row}>
          <View style={[styles.statCard, { backgroundColor: COLORS.successBg }]}>
            <Text style={[styles.statNumber, { color: COLORS.success }]}>{isLoading ? "—" : publishedCount}</Text>
            <Text style={styles.statLabel}>Published</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: COLORS.warningBg }]}>
            <Text style={[styles.statNumber, { color: COLORS.warning }]}>{isLoading ? "—" : draftCount}</Text>
            <Text style={styles.statLabel}>Drafts</Text>
          </View>
        </View>

        {!showForm && (
          <Pressable style={styles.newButton} onPress={() => setShowForm(true)}>
            <Text style={styles.newButtonText}>+ New Course</Text>
          </Pressable>
        )}

        {showForm && (
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Course title"
              placeholderTextColor={COLORS.placeholder}
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={[styles.input, { height: 90, textAlignVertical: "top" }]}
              placeholder="Description"
              placeholderTextColor={COLORS.placeholder}
              multiline
              value={description}
              onChangeText={setDescription}
            />
            <TextInput
              style={styles.input}
              placeholder="Price (e.g. 29.99)"
              placeholderTextColor={COLORS.placeholder}
              keyboardType="decimal-pad"
              value={price}
              onChangeText={setPrice}
            />
            {error && <Text style={styles.error}>{error}</Text>}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                style={[styles.newButton, { flex: 1 }]}
                disabled={createMutation.isPending}
                onPress={handleCreate}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.newButtonText}>Create Draft</Text>
                )}
              </Pressable>
              <Pressable
                style={[styles.newButton, { flex: 1, backgroundColor: COLORS.surfaceStrong }]}
                onPress={() => setShowForm(false)}
              >
                <Text style={styles.newButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 12 },
  statCard: { flex: 1, borderRadius: 16, padding: 20 },
  statNumber: { fontSize: 28, fontWeight: "800" },
  statLabel: { fontSize: 13, color: COLORS.muted, marginTop: 4 },
  newButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  newButtonText: { color: "#fff", fontWeight: "700" },
  form: { gap: 10, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 14 },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  error: { color: COLORS.danger, fontSize: 13 },
});