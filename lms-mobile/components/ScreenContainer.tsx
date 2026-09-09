import { StyleSheet, View, ScrollView, Pressable, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context"; // fixed: was 'react-native' (deprecated)
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants/theme";

type Props = {
  title: string;
  children?: React.ReactNode;
  showBack?: boolean;   // set true on screens reached via router.push from Profile
  scroll?: boolean;     // set false on screens that render their own FlatList/SectionList
};

export default function ScreenContainer({ title, children, showBack = false, scroll = true }: Props) {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.glowTop} pointerEvents="none" />
      <View style={styles.glowBottom} pointerEvents="none" />

      <View style={styles.header}>
        {showBack && (
          <Pressable
            style={styles.backButton}
            hitSlop={10}
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/(student)/profile"))}
          >
            <Ionicons name="chevron-back" size={22} color={COLORS.text} />
          </Pressable>
        )}
        <Text style={styles.title}>{title}</Text>
      </View>

      {scroll ? (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentInner}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        // No ScrollView here — the child (e.g. a FlatList) owns its own scrolling.
        <View style={[styles.content, styles.contentInner]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  glowTop: {
    position: "absolute",
    top: -90,
    left: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(147,51,234,0.12)",
  },
  glowBottom: {
    position: "absolute",
    top: 140,
    right: -90,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(8,145,178,0.10)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: { fontSize: 22, fontWeight: "800", color: COLORS.text },
  content: { flex: 1 },
  contentInner: { padding: 20, paddingBottom: 40 },
});