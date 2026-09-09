import { useState } from "react";
import { FlatList, Text, View, TextInput, StyleSheet, ActivityIndicator, Pressable, RefreshControl } from "react-native";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ScreenContainer from "../../components/ScreenContainer";
import { getPublishedCourses } from "../../lib/api/courses";
import { useCart } from "../../context/CartContext";
import { useDebouncedValue } from "@/hooks/useDebounceValue";
import { COLORS } from "../../constants/theme";

export default function Browse() {
  const router = useRouter();
  const { addToCart, isInCart } = useCart();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 400); // waits 400ms after typing stops before hitting the backend

  const { data, isLoading, isError, isFetching, refetch, isRefetching } = useQuery({
    queryKey: ["published-courses", debouncedSearch],
    queryFn: () => getPublishedCourses(debouncedSearch),
    placeholderData: keepPreviousData, // keeps showing the last results while a new search term loads, instead of flashing a blank/loading screen
  });

  return (
    // scroll={false}: this screen owns a FlatList, which already scrolls itself.
    // Nesting it inside ScreenContainer's default ScrollView triggers the
    // "VirtualizedLists should never be nested inside plain ScrollViews" warning.
    <ScreenContainer title="Browse Courses" scroll={false}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color={COLORS.mutedDark} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search courses..."
          placeholderTextColor={COLORS.placeholder}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={16} color={COLORS.mutedDark} />
          </Pressable>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : isError ? (
        <Text style={styles.error}>Couldn't load courses. Pull down to retry.</Text>
      ) : (
        <FlatList
          style={styles.list}
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ListHeaderComponent={
            // Shows briefly while the debounced search term is in flight,
            // without swapping out the whole list like the full isLoading state does.
            isFetching && !isRefetching ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginBottom: 8 }} />
            ) : null
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              {debouncedSearch ? `No courses match "${debouncedSearch}".` : "No published courses yet."}
            </Text>
          }
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
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 14, padding: 0 },
  list: { flex: 1 },
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