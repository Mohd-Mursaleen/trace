import { Feather } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { CalendarDayCell } from "@/components/CalendarDayCell";
import { useColors } from "@/hooks/useColors";
import { useJournalStore } from "@/hooks/useJournalStore";
import {
  MONTHS,
  MONTHS_SHORT,
  WEEKDAYS_SHORT,
  buildMonthGrid,
} from "@/lib/dates";

type Props = {
  onDayPress: (iso: string) => void;
};

type CalView = "month" | "year";

export function JournalCalendar({ onDayPress }: Props) {
  const colors = useColors();
  const { index } = useJournalStore();
  const today = new Date();

  const [view, setView] = useState<CalView>("month");
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const lookup = useMemo(() => {
    const map = new Map<string, { previewImage: string | null; hasText: boolean }>();
    for (const e of index) {
      map.set(e.date, { previewImage: e.previewImage, hasText: e.hasText });
    }
    return map;
  }, [index]);

  const yearEntryCount = useMemo(
    () => index.filter((e) => e.date.startsWith(`${year}-`)).length,
    [index, year],
  );

  return (
    <View style={styles.wrap}>
      {/* View toggle pill */}
      <View style={styles.toggleWrap}>
        <View
          style={[
            styles.togglePill,
            { backgroundColor: colors.cardAlt, borderColor: colors.border },
          ]}
        >
          {(["month", "year"] as CalView[]).map((mode) => (
            <Pressable
              key={mode}
              onPress={() => setView(mode)}
              style={({ pressed }) => ({
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 9,
                backgroundColor: view === mode ? colors.accent : "transparent",
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontFamily:
                    view === mode ? "Inter_600SemiBold" : "Inter_400Regular",
                  color: view === mode ? "#0a0a0a" : colors.textMuted,
                  letterSpacing: 0.2,
                }}
              >
                {mode === "month" ? "Monthly" : "Yearly"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Nav header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            if (view === "month") {
              if (month === 0) { setMonth(11); setYear(year - 1); }
              else setMonth(month - 1);
            } else {
              setYear(year - 1);
            }
          }}
          style={({ pressed }) => [
            styles.arrowBtn,
            { backgroundColor: pressed ? colors.cardAlt : "transparent" },
          ]}
        >
          <Feather name="chevron-left" size={16} color={colors.textMuted} />
        </Pressable>

        {view === "month" ? (
          <Text style={[styles.monthTitle, { color: colors.foreground }]}>
            {MONTHS[month]} {year}
          </Text>
        ) : (
          <View style={styles.yearTitleWrap}>
            <Text style={[styles.yearTitle, { color: colors.foreground }]}>
              {year}
            </Text>
            <Text style={[styles.yearCount, { color: colors.textMuted }]}>
              {yearEntryCount} {yearEntryCount === 1 ? "memory" : "memories"}
            </Text>
          </View>
        )}

        <Pressable
          onPress={() => {
            if (view === "month") {
              if (month === 11) { setMonth(0); setYear(year + 1); }
              else setMonth(month + 1);
            } else {
              setYear(year + 1);
            }
          }}
          style={({ pressed }) => [
            styles.arrowBtn,
            { backgroundColor: pressed ? colors.cardAlt : "transparent" },
          ]}
        >
          <Feather name="chevron-right" size={16} color={colors.textMuted} />
        </Pressable>
      </View>

      {view === "month" ? (
        <MonthView
          year={year}
          month={month}
          lookup={lookup}
          onDayPress={onDayPress}
        />
      ) : (
        <YearView
          year={year}
          lookup={lookup}
          onDayPress={(iso) => {
            const m = parseInt(iso.split("-")[1]!, 10) - 1;
            setMonth(m);
            setView("month");
            onDayPress(iso);
          }}
        />
      )}
    </View>
  );
}

function MonthView({
  year,
  month,
  lookup,
  onDayPress,
}: {
  year: number;
  month: number;
  lookup: Map<string, { previewImage: string | null; hasText: boolean }>;
  onDayPress: (iso: string) => void;
}) {
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

function YearView({
  year,
  lookup,
  onDayPress,
}: {
  year: number;
  lookup: Map<string, { previewImage: string | null; hasText: boolean }>;
  onDayPress: (iso: string) => void;
}) {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const horizontalPad = 16;
  const colGap = 16;
  const cellGap = 2;
  const containerWidth = Math.min(width, 600) - horizontalPad * 2;
  const monthBlockWidth = (containerWidth - colGap) / 2;
  const cellSize = Math.floor((monthBlockWidth - cellGap * 6) / 7);

  // Render months as explicit pairs — flexWrap in ScrollView contentContainerStyle
  // does not work reliably on native; explicit row pairs are the correct fix.
  const pairs = Array.from({ length: 6 }).map((_, i) => [i * 2, i * 2 + 1] as const);

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View
        style={{
          paddingHorizontal: horizontalPad,
          paddingBottom: 20,
          gap: 22,
        }}
      >
        {pairs.map(([m1, m2]) => (
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
  wrap: {
    width: "100%",
    alignSelf: "center",
    maxWidth: 600,
  },
  toggleWrap: {
    alignItems: "center",
    paddingTop: 16,
    paddingBottom: 4,
  },
  togglePill: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  arrowBtn: {
    padding: 8,
    borderRadius: 8,
  },
  monthTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
    letterSpacing: -0.3,
  },
  yearTitleWrap: {
    alignItems: "center",
  },
  yearTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    letterSpacing: -1,
  },
  yearCount: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    marginTop: 2,
    textAlign: "center",
  },
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
  miniHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: 2,
    paddingBottom: 8,
  },
  miniTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  miniCount: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    letterSpacing: 0.4,
  },
});
