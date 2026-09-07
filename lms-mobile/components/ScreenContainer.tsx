import { SafeAreaView, Text, StyleSheet, View } from "react-native";
import { COLORS } from "../constants/theme";

type Props = {
  title: string;
  children?: React.ReactNode;
};

export default function ScreenContainer({ title, children }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
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