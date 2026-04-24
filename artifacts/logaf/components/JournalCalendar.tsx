import { Feather } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { MonthView } from "@/components/MonthView";
import { YearView } from "@/components/YearView";
import { useColors } from "@/hooks/useColors";
import { useJournalStore } from "@/hooks/useJournalStore";
import { MONTHS } from "@/lib/dates";

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
                  fontFamily: view === mode ? "Inter_600SemiBold" : "Inter_400Regular",
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
            <Text style={[styles.yearTitle, { color: colors.foreground }]}>{year}</Text>
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
        <MonthView year={year} month={month} lookup={lookup} onDayPress={onDayPress} />
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
});
