import { Text, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ScreenContainer from "./ScreenContainer";
import { COLORS } from "../constants/theme";

// Mobile equivalent of the web's ComingSoonPage.tsx — same purpose:
// a placeholder for tabs whose real feature isn't built yet.
type Props = {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export default function ComingSoon({ title, description, icon }: Props) {
  return (
    <ScreenContainer title={title} showBack>
      <View style={styles.wrap}>
        <View style={styles.iconCircle}>
          <Ionicons name={icon} size={32} color={COLORS.primary} />
        </View>
        <Text style={styles.heading}>Coming soon</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  heading: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: "center",
    lineHeight: 20,
  },
});