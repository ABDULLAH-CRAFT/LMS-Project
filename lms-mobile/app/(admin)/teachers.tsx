import { useState } from "react";
import {
  FlatList,
  Text,
  View,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ScreenContainer from "../../components/ScreenContainer";
import { listTeachers, createTeacher } from "../../lib/api/admin";
import { COLORS } from "../../constants/theme";

export default function Teachers() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["admin-teachers"],
    queryFn: listTeachers,
  });

  const createMutation = useMutation({
    mutationFn: createTeacher,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin-teachers"] });
      setSuccessMessage(result.message);
      setShowForm(false);
      setName("");
      setEmail("");
      setPassword("");
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message ?? "Could not create teacher.";
      setError(Array.isArray(message) ? message[0] : message);
    },
  });

  const handleCreate = () => {
    setError(null);
    setSuccessMessage(null);
    if (name.trim().length < 1) return setError("Enter a name.");
    if (!email.includes("@")) return setError("Enter a valid email.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    createMutation.mutate({ name: name.trim(), email: email.trim(), password });
  };

  return (
    // scroll={false}: this screen owns a FlatList, which already scrolls itself.
    <ScreenContainer title="Teachers" scroll={false}>
      <FlatList
        style={styles.list}
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListHeaderComponent={
          <View style={{ marginBottom: 16, gap: 10 }}>
            {successMessage && <Text style={styles.success}>{successMessage}</Text>}

            {!showForm && (
              <Pressable style={styles.newButton} onPress={() => setShowForm(true)}>
                <Text style={styles.newButtonText}>+ Add Teacher</Text>
              </Pressable>
            )}

            {showForm && (
              <View style={styles.form}>
                <TextInput style={styles.input} placeholder="Full name"
                  placeholderTextColor={COLORS.placeholder}
                  value={name}
                  onChangeText={setName}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor={COLORS.placeholder}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Temporary password (min 6 chars)"
                  placeholderTextColor={COLORS.placeholder}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
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
                      <Text style={styles.newButtonText}>Create</Text>
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

            {isLoading && <ActivityIndicator color={COLORS.primary} />}
            {isError && <Text style={styles.error}>Couldn't load teachers. Pull down to retry.</Text>}
          </View>
        }
        ListEmptyComponent={!isLoading ? <Text style={styles.empty}>No teachers yet.</Text> : null}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.teacherName}>{item.name}</Text>
            <Text style={styles.teacherEmail}>{item.email}</Text>
            <Text style={styles.teacherDate}>
              Joined {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  newButton: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
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
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 16,
    gap: 4,
  },
  teacherName: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  teacherEmail: { fontSize: 13, color: COLORS.muted },
  teacherDate: { fontSize: 12, color: COLORS.muted },
  empty: { color: COLORS.muted, fontSize: 14, textAlign: "center", marginTop: 20 },
  error: { color: COLORS.danger, fontSize: 13 },
  success: { color: COLORS.success, fontSize: 13, fontWeight: "600" },
});