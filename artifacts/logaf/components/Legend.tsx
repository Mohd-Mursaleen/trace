import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export function Legend() {
  const colors = useColors();

  return (
    <View style={styles.wrap}>
      {/* logged: accentDim square with accent dot inside */}
      <View style={styles.item}>
        <View
          style={[
            styles.swatch,
            {
              backgroundColor: colors.accentDim,
              borderColor: "rgba(196,244,65,0.3)",
              alignItems: "center",
              justifyContent: "center",
            },
          ]}
        >
          <View style={[styles.swatchDot, { backgroundColor: colors.accent }]} />
        </View>
        <Text style={[styles.label, { color: colors.textMuted }]}>logged</Text>
      </View>

      {/* has photo: surface square with accent border + tinted fill */}
      <View style={styles.item}>
        <View
          style={[
            styles.swatch,
            {
              backgroundColor: colors.surface,
              borderColor: colors.accent,
              overflow: "hidden",
            },
          ]}
        >
          <View
            style={{ flex: 1, backgroundColor: "rgba(196,244,65,0.15)" }}
          />
        </View>
        <Text style={[styles.label, { color: colors.textMuted }]}>has photo</Text>
      </View>

      {/* today: just a ring, no fill */}
      <View style={styles.item}>
        <View
          style={[
            styles.swatchRing,
            { borderColor: colors.accent },
          ]}
        />
        <Text style={[styles.label, { color: colors.textMuted }]}>today</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 16,
    marginTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  label: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 10,
    letterSpacing: 0.3,
  },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: 2,
    borderWidth: 1,
  },
  swatchDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  swatchRing: {
    width: 12,
    height: 12,
    borderRadius: 2,
    borderWidth: 1.5,
  },
});
