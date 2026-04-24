import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { DotGrid } from "@/components/DotGrid";
import { useColors } from "@/hooks/useColors";

type Props = {
  topInset: number;
};

/** Full-screen lock state shown on Search when Supermemory is not enabled. */
export function SearchLockScreen({ topInset }: Props) {
  const colors = useColors();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <DotGrid />
      <View style={[styles.content, { paddingTop: topInset + 24 }]}>
        <View style={styles.iconWrap}>
          <View style={styles.haloOuter} />
          <View style={styles.haloInner} />
          <Feather name="lock" size={32} color={colors.accent} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Search is locked</Text>
        <Text style={[styles.body, { color: colors.textMuted }]}>
          Enable Supermemory to search your journal semantically - ask anything
          about your past.
        </Text>
        <Pressable
          onPress={() => router.push("/settings")}
          style={[styles.btn, { backgroundColor: colors.accent }]}
        >
          <Text style={styles.btnText}>Enable in Settings</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  haloOuter: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(196,244,65,0.06)",
  },
  haloInner: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(196,244,65,0.1)",
  },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 20,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  body: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
  },
  btn: {
    marginTop: 28,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 999,
  },
  btnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#0a0a0a",
  },
});
