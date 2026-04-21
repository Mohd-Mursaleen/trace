import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DayEditorSheet } from "@/components/DayEditorSheet";
import { JournalCalendar } from "@/components/JournalCalendar";
import { Legend } from "@/components/Legend";
import { ProfileHero } from "@/components/ProfileHero";
import { useColors } from "@/hooks/useColors";
import { useJournalStore } from "@/hooks/useJournalStore";
import { todayISO } from "@/lib/dates";

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
      <StatusBar style="light" />

      <View
        style={[
          styles.topBar,
          { paddingTop: insets.top + 8, borderBottomColor: "transparent" },
        ]}
      >
        <Text style={[styles.brand, { color: colors.text }]}>
          log<Text style={{ color: colors.accent }}>.</Text>af
        </Text>
        <Pressable
          onPress={() => router.push("/settings")}
          hitSlop={12}
          style={({ pressed }) => [
            styles.iconBtn,
            {
              backgroundColor: colors.cardAlt,
              borderColor: colors.border,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Feather name="settings" size={16} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHero
          name={profile.name}
          photoUri={profile.photoUri}
          count={index.length}
          onPress={() => setOpenDate(todayISO())}
        />

        <View style={styles.taglineWrap}>
          <Text style={[styles.tagline, { color: colors.textDim }]}>
            Your days, remembered
          </Text>
        </View>

        <View style={{ height: 8 }} />

        <JournalCalendar onDayPress={(iso) => setOpenDate(iso)} />

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
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  brand: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    letterSpacing: -0.4,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  taglineWrap: {
    alignItems: "center",
    paddingTop: 2,
    paddingBottom: 4,
  },
  tagline: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "lowercase",
  },
});
