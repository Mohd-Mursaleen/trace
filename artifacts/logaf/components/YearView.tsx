import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { CalendarDayCell } from "@/components/CalendarDayCell";
import { useColors } from "@/hooks/useColors";
import { MONTHS_SHORT, buildMonthGrid } from "@/lib/dates";

type Props = {
  year: number;
  lookup: Map<string, { previewImage: string | null; hasText: boolean }>;
  onDayPress: (iso: string) => void;
};

export function YearView({ year, lookup, onDayPress }: Props) {
  const colors = useColors();
  // Measure actual rendered width via onLayout — useWindowDimensions() is wrong
  // here because this component sits inside a card with marginHorizontal: 16,
  // which clips overflow and cuts off the last day column.
  const [viewWidth, setViewWidth] = useState(0);
  const horizontalPad = 16;
  const colGap = 16;
  const cellGap = 2;
  const containerWidth = viewWidth - horizontalPad * 2;
  const monthBlockWidth = (containerWidth - colGap) / 2;
  const cellSize = Math.max(1, Math.floor((monthBlockWidth - cellGap * 6) / 7));

  // Explicit row pairs — flexWrap in ScrollView contentContainerStyle
  // does not work reliably on native; explicit row pairs are the correct fix.
  const pairs = Array.from({ length: 6 }).map((_, i) => [i * 2, i * 2 + 1] as const);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      onLayout={(e) => setViewWidth(e.nativeEvent.layout.width)}
    >
      <View style={{ paddingHorizontal: horizontalPad, paddingBottom: 20, gap: 22 }}>
        {viewWidth === 0 ? null : pairs.map(([m1, m2]) => (
          <View key={m1} style={{ flexDirection: "row", gap: colGap }}>
            {[m1, m2].map((m) => {
              const cells = buildMonthGrid(year, m);
              const count = cells.filter((iso) => iso && lookup.has(iso)).length;
              return (
                <View key={m} style={{ width: monthBlockWidth }}>
                  <View style={styles.miniHeader}>
                    <Text style={[styles.miniTitle, { color: colors.text }]}>
                      {MONTHS_SHORT[m]}
                    </Text>
                    {count > 0 ? (
                      <Text style={[styles.miniCount, { color: colors.accent }]}>
                        {count}
                      </Text>
                    ) : null}
                  </View>
                  <View style={[styles.grid, { gap: cellGap }]}>
                    {cells.map((iso, i) => {
                      const data = iso ? lookup.get(iso) : undefined;
                      return (
                        <CalendarDayCell
                          key={iso ?? `e-${m}-${i}`}
                          iso={iso}
                          size={cellSize}
                          fontSize={Math.max(8, Math.round(cellSize * 0.46))}
                          preview={data?.previewImage ?? null}
                          hasText={data?.hasText ?? false}
                          onPress={onDayPress}
                        />
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  miniHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: 2,
    paddingBottom: 8,
  },
  miniTitle: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  miniCount: {
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 10,
    letterSpacing: 0.4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
});
