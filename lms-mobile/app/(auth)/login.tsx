import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { Link, useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { COLORS, CARD_SHADOW, PRIMARY_SHADOW } from "../../constants/theme";

export default function Login() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace("/"); // gate in index.tsx redirects by role
    } catch (err: any) {
      const message =
        err?.response?.data?.message ??
        "Login failed. Check your email/password and backend connection.";
      setError(Array.isArray(message) ? message[0] : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.brand}>Lumina Learn</Text>
      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.subtitle}>Log in to your LMS account</Text>

      <View style={styles.card}>
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
          placeholder="Password"
          placeholderTextColor={COLORS.placeholder}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Log In</Text>}
        </Pressable>
      </View>

      <Link href="/(auth)/register" style={styles.link}>
        Don't have an account? Register
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
