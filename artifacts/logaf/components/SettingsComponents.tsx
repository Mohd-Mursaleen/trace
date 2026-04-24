import { Feather } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export function SectionTitle({ text }: { text: string }) {
  const colors = useColors();
  return <Text style={[styles.sectionTitle, { color: colors.textDim }]}>{text}</Text>;
}

export function SectionCard({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.sectionCard,
        { borderColor: colors.border, backgroundColor: colors.card },
      ]}
    >
      {children}
    </View>
  );
}

export function Row({ children, noBorder = false }: { children: React.ReactNode; noBorder?: boolean }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.row,
        !noBorder && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
      ]}
    >
      {children}
    </View>
  );
}

export function DataButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  onPress: () => void;
  disabled: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.dataBtn,
        {
          backgroundColor: colors.cardAlt,
          borderColor: colors.border,
          opacity: pressed || disabled ? 0.6 : 1,
        },
      ]}
    >
      <Feather name={icon} size={16} color={colors.text} />
      <Text style={[styles.dataBtnText, { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginLeft: 20,
    marginBottom: 8,
    marginTop: 24,
  },
  sectionCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    padding: 14,
    gap: 10,
  },
  dataBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
  },
  dataBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
});
