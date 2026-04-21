import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export function Legend() {
  const colors = useColors();
  return (
    <View style={styles.wrap}>
      <Text style={[styles.item, { color: colors.mutedForeground }]}>
        <Text style={{ color: colors.accent }}>●</Text> logged
      </Text>
      <Text style={[styles.item, { color: colors.mutedForeground }]}>
        <Text style={{ color: colors.text }}>◉</Text> has photo
      </Text>
      <Text style={[styles.item, { color: colors.mutedForeground }]}>
        <Text style={{ color: colors.accent }}>◎</Text> today
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 18,
    marginTop: 12,
    paddingVertical: 8,
  },
  item: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    letterSpacing: 0.3,
    textTransform: "lowercase",
  },
});
