import { StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { CalendarDayCell } from "@/components/CalendarDayCell";
import { useColors } from "@/hooks/useColors";
import { WEEKDAYS_SHORT, buildMonthGrid } from "@/lib/dates";

type Props = {
  year: number;
  month: number;
  lookup: Map<string, { previewImage: string | null; hasText: boolean }>;
  onDayPress: (iso: string) => void;
};

export function MonthView({ year, month, lookup, onDayPress }: Props) {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const horizontalPad = 16;
  const gap = 6;
  const available = Math.min(width, 600) - horizontalPad * 2;
  const cellSize = Math.floor((available - gap * 6) / 7);
  const cells = buildMonthGrid(year, month);

  return (
    <View style={{ paddingHorizontal: horizontalPad, paddingBottom: 16 }}>
      <View style={styles.weekdayRow}>
        {WEEKDAYS_SHORT.map((d, i) => (
          <Text
            key={`${d}-${i}`}
            style={[styles.weekday, { color: colors.textDim, width: cellSize }]}
          >
            {d}
          </Text>
        ))}
      </View>
      <View style={[styles.grid, { gap }]}>
        {cells.map((iso, i) => {
          const data = iso ? lookup.get(iso) : undefined;
          return (
            <CalendarDayCell
              key={iso ?? `empty-${i}`}
              iso={iso}
              size={cellSize}
              fontSize={Math.max(13, Math.round(cellSize * 0.36))}
              preview={data?.previewImage ?? null}
              hasText={data?.hasText ?? false}
              onPress={onDayPress}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  weekdayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 8,
    paddingTop: 4,
  },
  weekday: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 0.8,
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
});
