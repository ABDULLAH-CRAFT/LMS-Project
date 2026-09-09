
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCart } from "../../context/CartContext";
import { COLORS } from "../../constants/theme";

export default function Payment() {
  const { items, total } = useCart();
  const router = useRouter();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Checkout</Text>
        <Text style={styles.subtitle}>
          Review your order before proceeding
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Summary</Text>

        {items.map((course) => (
          <View key={course.id} style={styles.courseRow}>
            <View style={styles.courseInfo}>
              <Text style={styles.courseTitle}>{course.title}</Text>
              <Text style={styles.coursePrice}>₹{course.price}</Text>
            </View>

            <Ionicons
              name="book-outline"
              size={22}
              color={COLORS.primary}
            />
          </View>
        ))}
      </View>

      <View style={styles.totalCard}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>₹{total}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.totalRow}>
          <Text style={styles.finalTotalLabel}>Total</Text>
          <Text style={styles.finalTotalValue}>₹{total}</Text>
        </View>
      </View>

      <View style={styles.infoBox}>
        <Ionicons
          name="information-circle-outline"
          size={22}
          color={COLORS.primary}
        />

        <Text style={styles.infoText}>
          Payment functionality is currently unavailable. You can review your
          order here.
        </Text>
      </View>

      <Pressable
        style={styles.checkoutButton}
        onPress={() => {}}
      >
        <Text style={styles.checkoutButtonText}>
          Proceed to Payment
        </Text>
      </Pressable>

      <Pressable
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>Back to Cart</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  header: {
    marginBottom: 24,
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.text,
  },

  subtitle: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 6,
  },

  section: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 16,
  },

  courseRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  courseInfo: {
    flex: 1,
    marginRight: 12,
  },

  courseTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
  },

  coursePrice: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "700",
    marginTop: 5,
  },

  totalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  totalLabel: {
    fontSize: 14,
    color: COLORS.muted,
  },

  totalValue: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
  },

  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 14,
  },

  finalTotalLabel: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },

  finalTotalValue: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.primary,
  },

  infoBox: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#eef4ff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
  },

  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.text,
  },

  checkoutButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
  },

  checkoutButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },

  backButton: {
    alignItems: "center",
    paddingVertical: 16,
    marginTop: 6,
  },

  backButtonText: {
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: "600",
  },
});
