import { StyleSheet, View, ScrollView, Pressable, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context"; // fixed: was 'react-native' (deprecated)
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SOFT_SHADOW } from "../constants/theme";

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
      <View style={styles.header}>
        {showBack && (
          <Pressable
            style={styles.backButton}
            hitSlop={10}
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/(student)/profile"))}
          >
            <Ionicons name="chevron-back" size={20} color={COLORS.text} />
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
    ...SOFT_SHADOW,
  },
  title: { fontSize: 20, fontWeight: "800", color: COLORS.text, letterSpacing: -0.3 },
  content: { flex: 1 },
  contentInner: { padding: 20, paddingBottom: 40 },
});
