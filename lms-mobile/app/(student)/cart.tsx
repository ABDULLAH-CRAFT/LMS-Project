import { FlatList, Text, View, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import ScreenContainer from "../../components/ScreenContainer";
import { useCart } from "../../context/CartContext";
import { COLORS } from "../../constants/theme";

export default function Cart() {
  const { items, removeFromCart, total } = useCart();
  const router = useRouter();

  return (
    <ScreenContainer title="Shopping Cart">
      {items.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Your cart is empty.</Text>
          <Pressable style={styles.browseButton} onPress={() => router.push("/(student)/browse")}>
            <Text style={styles.browseButtonText}>Browse courses</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ gap: 10 }}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.itemMeta}>Digital course · Lifetime access</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.itemPrice}>{Number(item.price) <= 0 ? "Free" : `₹${item.price}`}</Text>
                  <Pressable onPress={() => removeFromCart(item.id)}>
                    <Text style={styles.removeText}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            )}
          />

          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Subtotal ({items.length} {items.length === 1 ? "item" : "items"})
              </Text>
              <Text style={styles.summaryValue}>₹{total}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.grandTotalLabel}>Grand Total</Text>
              <Text style={styles.grandTotalValue}>₹{total}</Text>
            </View>

            <Pressable style={styles.checkoutButton} onPress={() => router.push("/(student)/payment")}>
              <Text style={styles.checkoutButtonText}>Proceed to Payment</Text>
            </Pressable>
            <Text style={styles.secureNote}>Secure checkout via Razorpay</Text>
          </View>
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  emptyBox: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 40,
    alignItems: "center",
    marginTop: 30,
  },
  emptyText: { color: COLORS.muted, marginBottom: 16 },
  browseButton: { backgroundColor: COLORS.primary, borderRadius: 999, paddingHorizontal: 20, paddingVertical: 12 },
  browseButtonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
  },
  itemTitle: { color: COLORS.text, fontWeight: "700", fontSize: 14 },
  itemMeta: { color: COLORS.mutedDark, fontSize: 11, marginTop: 2 },
  itemPrice: { color: COLORS.text, fontWeight: "700", fontSize: 14 },
  removeText: { color: COLORS.danger, fontSize: 11, marginTop: 4 },
  summary: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 18,
    marginTop: 16,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryLabel: { color: COLORS.muted, fontSize: 13 },
  summaryValue: { color: COLORS.muted, fontSize: 13 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
  grandTotalLabel: { color: COLORS.text, fontWeight: "700", fontSize: 15 },
  grandTotalValue: { color: COLORS.text, fontWeight: "800", fontSize: 18 },
  checkoutButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 18,
  },
  checkoutButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  secureNote: { color: COLORS.mutedDark, fontSize: 11, textAlign: "center", marginTop: 10 },
});