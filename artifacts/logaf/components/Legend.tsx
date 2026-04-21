import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export function Legend() {
  const colors = useColors();
  return (
    <View style={styles.wrap}>
      <Item label="logged" color={colors.accent} kind="dot" />
      <Item label="photo" color={colors.text} kind="square" />
      <Item label="today" color={colors.accent} kind="ring" />
    </View>
  );
}

function Item({
  label,
  color,
  kind,
}: {
  label: string;
  color: string;
  kind: "dot" | "square" | "ring";
}) {
  const colors = useColors();
  const swatch =
    kind === "dot" ? (
      <View style={[styles.dot, { backgroundColor: color }]} />
    ) : kind === "square" ? (
      <View
        style={[
          styles.square,
          { backgroundColor: colors.cardHigh, borderColor: colors.borderStrong },
        ]}
      />
    ) : (
      <View
        style={[
          styles.ring,
          { borderColor: color },
        ]}
      />
    );
  return (
    <View style={styles.item}>
      {swatch}
      <Text style={[styles.label, { color: colors.mutedForeground }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 18,
    paddingVertical: 14,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  label: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: "lowercase",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  square: {
    width: 10,
    height: 10,
    borderRadius: 3,
    borderWidth: 1,
  },
  ring: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
  },
});
