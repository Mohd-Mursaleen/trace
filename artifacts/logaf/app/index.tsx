import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DayEditorSheet } from "@/components/DayEditorSheet";
import { DotGrid } from "@/components/DotGrid";
import { JournalCalendar } from "@/components/JournalCalendar";
import { Legend } from "@/components/Legend";
import { QuoteBanner } from "@/components/QuoteBanner";
import { useColors } from "@/hooks/useColors";
import { useJournalStore } from "@/hooks/useJournalStore";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { ready, profile, index } = useJournalStore();
  const [openDate, setOpenDate] = useState<string | null>(null);

  useEffect(() => {
    if (ready && !profile.hasCompletedOnboarding) {
      router.replace("/onboarding");
    }
  }, [ready, profile.hasCompletedOnboarding]);

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <DotGrid />
      <StatusBar style="light" />

      {/* Nav header */}
      <View
        style={[
          styles.nav,
          {
            marginTop: insets.top + 8,
            borderColor: colors.border,
          },
        ]}
      >
        {/* Left — logo + brand name */}
        <View style={styles.navLeft}>
          <Image
            source={require("../assets/icon.png")}
            style={styles.navLogo}
            contentFit="cover"
          />
          <Text style={[styles.navBrand, { color: colors.text }]}>trace.</Text>
        </View>

        {/* Centre — memory count */}
        <Text style={[styles.navMemories, { color: colors.textSecondary }]}>
          {index.length} {index.length === 1 ? "memory" : "memories"} logged
        </Text>

        {/* Right — name + settings */}
        <View style={styles.navRight}>
          <Text style={[styles.navName, { color: colors.text }]}>
            {profile.name.trim() || "Traveller"}
          </Text>
          <Pressable
            onPress={() => router.push("/settings")}
            hitSlop={12}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Feather name="settings" size={16} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <QuoteBanner />

        <View style={{ height: 8 }} />

        {/* Calendar card */}
        <View
          style={[
            styles.calendarCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <JournalCalendar onDayPress={(iso) => setOpenDate(iso)} />
        </View>

        <Legend />
      </ScrollView>

      <DayEditorSheet
        date={openDate}
        visible={openDate !== null}
        onClose={() => setOpenDate(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "rgba(17,17,17,0.9)",
  },
  navLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  navLogo: {
    width: 28,
    height: 28,
    borderRadius: 6,
    overflow: "hidden",
  },
  navBrand: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    letterSpacing: -0.1,
  },
  navMemories: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    letterSpacing: 0.1,
    textAlign: "center",
    flex: 1,
  },
  navRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  navName: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: -0.1,
    maxWidth: 80,
  },
  calendarCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
});
