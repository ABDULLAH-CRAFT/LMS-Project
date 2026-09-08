import { FlatList, Text, View, StyleSheet, ActivityIndicator, Pressable, RefreshControl } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import ScreenContainer from "../../components/ScreenContainer";
import { getPublishedCourses } from "../../lib/api/courses";
import { useCart } from "../../context/CartContext";
import { COLORS } from "../../constants/theme";

export default function Browse() {
  const router = useRouter();
  const { addToCart, isInCart } = useCart();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["published-courses"],
    queryFn: getPublishedCourses,
  });

  if (isLoading) {
    return (
      <ScreenContainer title="Browse Courses">
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      </ScreenContainer>
    );
  }

  if (isError) {
    return (
      <ScreenContainer title="Browse Courses">
        <Text style={styles.error}>Couldn't load courses. Pull down to retry.</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer title="Browse Courses">
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 12 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListEmptyComponent={<Text style={styles.empty}>No published courses yet.</Text>}
        renderItem={({ item }) => {
          const inCart = isInCart(item.id);
          return (
            <View style={styles.card}>
              <Pressable onPress={() => router.push(`/(student)/course/${item.id}`)}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
              </Pressable>
              <View style={styles.footer}>
                <Text style={styles.price}>{Number(item.price) <= 0 ? "Free" : `₹${item.price}`}</Text>
                <Pressable
                  style={[styles.cartButton, inCart && styles.cartButtonDisabled]}
                  disabled={inCart}
                  onPress={() => addToCart(item)}
                >
                  <Text style={styles.cartButtonText}>{inCart ? "In cart ✓" : "Add to cart"}</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  title: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  desc: { fontSize: 13, color: COLORS.muted },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  price: { fontSize: 14, fontWeight: "700", color: COLORS.primary },
  cartButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceStrong,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  cartButtonDisabled: { opacity: 0.5 },
  cartButtonText: { color: COLORS.text, fontSize: 12, fontWeight: "600" },
  empty: { color: COLORS.muted, fontSize: 14, textAlign: "center", marginTop: 40 },
  error: { color: COLORS.danger, fontSize: 13, marginTop: 8 },
});