import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DotGrid } from "@/components/DotGrid";
import { useColors } from "@/hooks/useColors";

export default function PrivacyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <DotGrid />
      <StatusBar style="light" />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => router.back()}
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
          <Feather name="chevron-left" size={18} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Privacy</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Tagline */}
        <View style={styles.hero}>
          <View style={[styles.heroIcon, { backgroundColor: colors.accentDim, borderColor: colors.accentRing }]}>
            <Feather name="shield" size={22} color={colors.accent} />
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            Your data, your control
          </Text>
          <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
            log.af is built on one principle: your thoughts belong to you. Here's exactly what happens to your data.
          </Text>
        </View>

        {/* Section 1 */}
        <PrivacySection
          icon="smartphone"
          title="Journal stays on your device"
          colors={colors}
        >
          <BulletItem colors={colors}>
            Every entry you write is saved in your phone's local storage using AsyncStorage — no servers, no cloud sync by default.
          </BulletItem>
          <BulletItem colors={colors}>
            Photos you attach are stored in your device's file system under the log.af folder.
          </BulletItem>
          <BulletItem colors={colors}>
            Uninstalling the app removes all local data permanently. Use Export (in Settings) to keep a backup.
          </BulletItem>
        </PrivacySection>

        {/* Section 2 */}
        <PrivacySection
          icon="zap"
          title="Supermemory integration"
          colors={colors}
        >
          <BulletItem colors={colors}>
            Supermemory is an optional feature — off by default. You must explicitly enable it and provide your own API key.
          </BulletItem>
          <BulletItem colors={colors}>
            When enabled, the text of each entry is sent directly from your device to your personal Supermemory account using your API key.
          </BulletItem>
          <BulletItem colors={colors}>
            log.af never sees your Supermemory key or the data sent to it. The connection is between your device and your account.
          </BulletItem>
          <BulletItem colors={colors}>
            The knowledge graph built in Supermemory is stored in your account only. You can delete it any time from the Supermemory console.
          </BulletItem>
          <Pressable
            onPress={() => Linking.openURL("https://supermemory.ai/privacy")}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, marginTop: 2 })}
          >
            <Text style={[styles.externalLink, { color: colors.accent }]}>
              Supermemory privacy policy →
            </Text>
          </Pressable>
        </PrivacySection>

        {/* Section 3 */}
        <PrivacySection
          icon="bar-chart-2"
          title="No tracking, no analytics"
          colors={colors}
        >
          <BulletItem colors={colors}>
            log.af collects zero usage data, crash reports, or analytics.
          </BulletItem>
          <BulletItem colors={colors}>
            There are no third-party SDKs for tracking, advertising, or behaviour analysis.
          </BulletItem>
          <BulletItem colors={colors}>
            Voice transcription uses Deepgram. Audio is sent to Deepgram's servers only while recording and is not stored by them after transcription.
          </BulletItem>
        </PrivacySection>

        {/* Section 4 */}
        <PrivacySection
          icon="download"
          title="Export & portability"
          colors={colors}
        >
          <BulletItem colors={colors}>
            You can export all your journal entries and photos at any time from Settings → Data.
          </BulletItem>
          <BulletItem colors={colors}>
            The export is a self-contained .logaf file that you can import back into any log.af installation.
          </BulletItem>
          <BulletItem colors={colors}>
            We encourage you to take your backup before deleting the app. We have no way to recover data for you.
          </BulletItem>
        </PrivacySection>

        <Text style={[styles.footer, { color: colors.textDim }]}>
          log.af · Built with privacy as default, not a feature
        </Text>
      </ScrollView>
    </View>
  );
}

function PrivacySection({
  icon,
  title,
  children,
  colors,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  children: React.ReactNode;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  return (
    <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: colors.accentDim }]}>
          <Feather name={icon} size={14} color={colors.accent} />
        </View>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function BulletItem({
  children,
  colors,
}: {
  children: React.ReactNode;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  return (
    <View style={styles.bullet}>
      <View style={[styles.bulletDot, { backgroundColor: colors.textDim }]} />
      <Text style={[styles.bulletText, { color: colors.textSecondary }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    letterSpacing: -0.2,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 16,
  },
  hero: {
    alignItems: "center",
    paddingVertical: 16,
    gap: 10,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  heroTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    letterSpacing: -0.5,
    textAlign: "center",
  },
  heroSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  section: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    paddingBottom: 12,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    letterSpacing: -0.1,
  },
  sectionBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
  bullet: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  bulletDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 8,
    flexShrink: 0,
  },
  bulletText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 13.5,
    lineHeight: 21,
  },
  externalLink: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    paddingLeft: 14,
  },
  footer: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 8,
  },
});
