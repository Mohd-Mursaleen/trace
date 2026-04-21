import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

type Props = {
  name: string;
  count: number;
};

export function ProfileHero({ name, count }: Props) {
  const colors = useColors();
  const displayName = name.trim() || "My Journal";
  const memoryWord = count === 1 ? "memory" : "memories";

  return (
    <View style={styles.wrap}>
      <Text style={[styles.name, { color: colors.foreground }]}>{displayName}</Text>
      <Text style={[styles.count, { color: colors.textMuted }]}>
        {count} {memoryWord} logged
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 8,
    gap: 4,
  },
  name: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 20,
    letterSpacing: -0.3,
  },
  count: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    letterSpacing: 0.3,
  },
});
