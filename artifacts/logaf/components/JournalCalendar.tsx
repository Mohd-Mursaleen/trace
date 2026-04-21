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

type View = "month" | "year";

export function JournalCalendar({ onDayPress }: Props) {
  const colors = useColors();
  const { index } = useJournalStore();
  const today = new Date();

  const [view, setView] = useState<View>("month");
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const lookup = useMemo(() => {
    const map = new Map<string, { previewImage: string | null; hasText: boolean }>();
    for (const e of index) {
      map.set(e.date, { previewImage: e.previewImage, hasText: e.hasText });
    }
    return map;
  }, [index]);

  return (
    <View style={styles.wrap}>
      <Header
        view={view}
        year={year}
        month={month}
        onToggle={() => setView(view === "month" ? "year" : "month")}
        onPrev={() => {
          if (view === "month") {
            if (month === 0) {
              setMonth(11);
              setYear(year - 1);
            } else {
              setMonth(month - 1);
            }
          } else {
            setYear(year - 1);
          }
        }}
        onNext={() => {
          if (view === "month") {
            if (month === 11) {
              setMonth(0);
              setYear(year + 1);
            } else {
              setMonth(month + 1);
            }
          } else {
            setYear(year + 1);
          }
        }}
      />

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

function Header({
  view,
  year,
  month,
  onToggle,
  onPrev,
  onNext,
}: {
  view: View;
  year: number;
  month: number;
  onToggle: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const colors = useColors();
  const title = view === "month" ? `${MONTHS[month]} ${year}` : `${year}`;
  return (
    <View style={styles.header}>
      <Pressable
        onPress={onPrev}
        hitSlop={10}
        style={({ pressed }) => [
          styles.iconBtn,
          {
            backgroundColor: colors.cardAlt,
            borderColor: colors.border,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Feather name="chevron-left" size={16} color={colors.text} />
      </Pressable>

      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [styles.titleBtn, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.toggleHint, { color: colors.mutedForeground }]}>
          {view === "month" ? "month" : "year"}
        </Text>
      </Pressable>

      <Pressable
        onPress={onNext}
        hitSlop={10}
        style={({ pressed }) => [
          styles.iconBtn,
          {
            backgroundColor: colors.cardAlt,
            borderColor: colors.border,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Feather name="chevron-right" size={16} color={colors.text} />
      </Pressable>
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
  const horizontalPad = 20;
  const gap = 6;
  const available = Math.min(width, 600) - horizontalPad * 2;
  const cellSize = Math.floor((available - gap * 6) / 7);
  const cells = buildMonthGrid(year, month);

  return (
    <View style={{ paddingHorizontal: horizontalPad }}>
      <View style={styles.weekdayRow}>
        {WEEKDAYS_SHORT.map((d, i) => (
          <Text
            key={`${d}-${i}`}
            style={[
              styles.weekday,
              { color: colors.textDim, width: cellSize },
            ]}
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
  const horizontalPad = 20;
  const colGap = 16;
  const cellGap = 2;
  const containerWidth = Math.min(width, 600) - horizontalPad * 2;
  const monthBlockWidth = (containerWidth - colGap) / 2;
  const cellSize = Math.floor((monthBlockWidth - cellGap * 6) / 7);

  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: horizontalPad,
        paddingBottom: 20,
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 22,
        justifyContent: "space-between",
      }}
      showsVerticalScrollIndicator={false}
    >
      {Array.from({ length: 12 }).map((_, m) => {
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    alignSelf: "center",
    maxWidth: 600,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  titleBtn: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
    letterSpacing: -0.3,
  },
  toggleHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "lowercase",
  },
  weekdayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 8,
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
