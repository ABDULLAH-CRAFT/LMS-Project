import { SafeAreaView, Text, StyleSheet, View } from "react-native";
import { COLORS } from "../constants/theme";

type Props = {
  title: string;
  children?: React.ReactNode;
};

export default function ScreenContainer({ title, children }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      {/* Ambient glow blobs — cheap version of the blurred purple/cyan circles
          on the web dashboard (DashboardLayout.tsx). No blur filter, just
          soft, low-opacity color so it stays subtle behind content. */}
      <View style={styles.glowTop} pointerEvents="none" />
      <View style={styles.glowBottom} pointerEvents="none" />

      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.content}>{children}</View>
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
    backgroundColor: "rgba(147,51,234,0.12)", // purple-700 glow
  },
  glowBottom: {
    position: "absolute",
    top: 140,
    right: -90,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(8,145,178,0.10)", // cyan-600 glow
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: 22, fontWeight: "800", color: COLORS.text },
  content: { flex: 1, padding: 20 },
});
