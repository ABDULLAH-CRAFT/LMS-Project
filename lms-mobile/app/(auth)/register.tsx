import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { Link, useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { COLORS, CARD_SHADOW, PRIMARY_SHADOW } from "../../constants/theme";

export default function Register() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError(null);
    setLoading(true);
    try {
      await register(email.trim(), password, name.trim());
      router.replace("/"); // public register always creates a student — gate sends them to student dashboard
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? "Registration failed. Please try again.";
      setError(Array.isArray(message) ? message[0] : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.brand}>Lumina Learn</Text>
      <Text style={styles.title}>Create an account</Text>
      <Text style={styles.subtitle}>Sign up as a student</Text>

      <View style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder="Full name"
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
          placeholder="Password (min 6 characters)"
          placeholderTextColor={COLORS.placeholder}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable style={styles.button} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Register</Text>}
        </Pressable>
      </View>

      <Link href="/(auth)/login" style={styles.link}>
        Already have an account? Log in
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 24, paddingTop: 110, gap: 6 },
  brand: { fontSize: 14, fontWeight: "700", color: COLORS.primary, letterSpacing: 0.5, textTransform: "uppercase" },
  title: { fontSize: 30, fontWeight: "800", color: COLORS.text, marginTop: 6, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: COLORS.muted, marginBottom: 20 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
    gap: 14,
    ...CARD_SHADOW,
  },
  input: {
    backgroundColor: COLORS.surfaceStrong,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
    ...PRIMARY_SHADOW,
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  error: { color: COLORS.danger, fontSize: 13 },
  link: { color: COLORS.primary, fontWeight: "700", textAlign: "center", marginTop: 22, fontSize: 13 },
});
