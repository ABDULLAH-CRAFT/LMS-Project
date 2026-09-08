import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useCart } from "../../context/CartContext";
import { useEnrollCourse, getRazorpayErrorMessage } from "../../hooks/useEnrollCourse";
import { COLORS } from "../../constants/theme";

type Status = "processing" | "success" | "error";

export default function Payment() {
  const { items, clearCart, total } = useCart();
  const router = useRouter();
  const queryClient = useQueryClient();
  const enrollMutation = useEnrollCourse();
  const [status, setStatus] = useState<Status>("processing");
  const [errorMessage, setErrorMessage] = useState("");

  function runPayment() {
    setStatus("processing");
    enrollMutation.mutate(
      { courseIds: items.map((c) => c.id) },
      {
        onSuccess: () => {
          clearCart();
          queryClient.invalidateQueries({ queryKey: ["my-enrollments"] });
          setStatus("success");
        },
        onError: (error) => {
          setErrorMessage(getRazorpayErrorMessage(error));
          setStatus("error");
        },
      }
    );
  }

  // Kick off payment as soon as the screen opens.
  useEffect(() => {
    if (items.length === 0) {
      router.replace("/(student)/cart");
      return;
    }
    runPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      {status === "processing" && (
        <>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.title}>Processing payment...</Text>
          <Text style={styles.subtitle}>Charging ₹{total} for {items.length} {items.length === 1 ? "course" : "courses"}</Text>
        </>
      )}

      {status === "success" && (
        <>
          <View style={styles.iconCircleSuccess}>
            <Ionicons name="checkmark" size={36} color={COLORS.success} />
          </View>
          <Text style={styles.title}>Payment successful</Text>
          <Text style={styles.subtitle}>You're enrolled — your courses are ready.</Text>
          <Pressable style={styles.primaryButton} onPress={() => router.replace("/(student)/my-courses")}>
            <Text style={styles.primaryButtonText}>Go to My Courses</Text>
          </Pressable>
        </>
      )}

      {status === "error" && (
        <>
          <View style={styles.iconCircleError}>
            <Ionicons name="close" size={36} color={COLORS.danger} />
          </View>
          <Text style={styles.title}>Payment failed</Text>
          <Text style={styles.subtitle}>{errorMessage}. Nothing was charged.</Text>
          <Pressable style={styles.primaryButton} onPress={runPayment}>
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
            <Text style={styles.secondaryButtonText}>Back to Cart</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center", padding: 32, gap: 6 },
  title: { color: COLORS.text, fontSize: 18, fontWeight: "800", marginTop: 16, textAlign: "center" },
  subtitle: { color: COLORS.muted, fontSize: 13, textAlign: "center", marginTop: 4 },
  iconCircleSuccess: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.successBg,
    borderWidth: 1, borderColor: COLORS.success, alignItems: "center", justifyContent: "center",
  },
  iconCircleError: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.dangerBg,
    borderWidth: 1, borderColor: COLORS.danger, alignItems: "center", justifyContent: "center",
  },
  primaryButton: { backgroundColor: COLORS.primary, borderRadius: 999, paddingHorizontal: 28, paddingVertical: 14, marginTop: 22 },
  primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  secondaryButton: { marginTop: 14 },
  secondaryButtonText: { color: COLORS.muted, fontSize: 13 },
});