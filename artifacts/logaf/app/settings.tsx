import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DotGrid } from "@/components/DotGrid";
import { SupermemorySetupModal } from "@/components/SupermemorySetupModal";
import { useColors } from "@/hooks/useColors";
import { useJournalStore } from "@/hooks/useJournalStore";
import { exportData, importData, type ConflictResolution } from "@/lib/exportImport";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile, copyImageToLocal, refresh } = useJournalStore();

  const [name, setName] = useState(profile.name);
  const [smModalVisible, setSmModalVisible] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const saveName = async () => {
    await updateProfile({ name: name.trim() });
  };

  const changePhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo access to set an avatar.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled) return;
    const local = await copyImageToLocal(result.assets[0]!.uri);
    await updateProfile({ photoUri: local });
  };

  const removePhoto = async () => {
    await updateProfile({ photoUri: "" });
  };

  // --- Supermemory toggle ---
  // If turning on: open the setup modal. If turning off: disable immediately.
  const handleSmToggle = async () => {
    if (profile.supermemoryEnabled) {
      await updateProfile({ supermemoryEnabled: false });
    } else {
      setSmModalVisible(true);
    }
  };

  // Called when the setup modal finishes — with a verified key or null (cancelled)
  const handleSmDone = async (key: string | null) => {
    setSmModalVisible(false);
    if (key) {
      await updateProfile({ supermemoryEnabled: true, supermemoryKey: key });
    }
    // key === null means user cancelled — leave toggle off
  };

  // --- Export ---
  const handleExport = async () => {
    setExporting(true);
    const result = await exportData();
    setExporting(false);
    if (!result.success && result.error !== "cancelled") {
      Alert.alert("Export failed", result.error ?? "Unknown error");
    }
  };

  // --- Import ---
  const handleImport = async () => {
    setImporting(true);

    const onConflict = (conflictCount: number): Promise<ConflictResolution> =>
      new Promise((resolve) => {
        Alert.alert(
          "Conflicts found",
          `${conflictCount} date${conflictCount > 1 ? "s" : ""} in the backup already exist in your journal. What would you like to do?`,
          [
            {
              text: "Keep current",
              onPress: () => resolve("keep"),
            },
            {
              text: "Replace with backup",
              style: "destructive",
              onPress: () => resolve("replace"),
            },
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => resolve("cancel"),
            },
          ],
        );
      });

    const result = await importData(onConflict);
    setImporting(false);

    if (result.error === "cancelled") return;

    if (!result.success) {
      Alert.alert("Import failed", result.error ?? "Unknown error");
      return;
    }

    // Refresh the journal index so the calendar reflects imported entries
    await refresh();

    const msg = [
      `Imported: ${result.imported} ${result.imported === 1 ? "entry" : "entries"}`,
      result.skipped ? `Skipped (kept current): ${result.skipped}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    Alert.alert("Import complete", msg);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <DotGrid />
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
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
          <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
          <View style={{ width: 34 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 32,
            gap: 28,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Profile */}
          <Section title="Profile">
            <View style={styles.profileRow}>
              <Pressable
                onPress={changePhoto}
                style={({ pressed }) => [
                  styles.avatarBtn,
                  {
                    borderColor: colors.borderStrong,
                    backgroundColor: colors.cardAlt,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                {profile.photoUri ? (
                  <Image
                    source={{ uri: profile.photoUri }}
                    style={styles.avatarImg}
                    contentFit="cover"
                  />
                ) : (
                  <Feather name="user" size={20} color={colors.textDim} />
                )}
              </Pressable>
              <View style={{ flex: 1, gap: 6 }}>
                <Pressable
                  onPress={changePhoto}
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                >
                  <Text style={[styles.link, { color: colors.accent }]}>
                    {profile.photoUri ? "Change photo" : "Add photo"}
                  </Text>
                </Pressable>
                {profile.photoUri ? (
                  <Pressable
                    onPress={removePhoto}
                    style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                  >
                    <Text style={[styles.linkMuted, { color: colors.mutedForeground }]}>
                      Remove
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            <View style={{ gap: 8 }}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                onBlur={saveName}
                placeholder="Your name"
                placeholderTextColor={colors.textDim}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.cardAlt,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                selectionColor={colors.accent}
              />
            </View>
          </Section>

          {/* Supermemory */}
          <Section title="Supermemory">
            <Text style={[styles.helper, { color: colors.mutedForeground }]}>
              Turn your journal into a personal knowledge graph. Your AI agents get smarter every time you write.
            </Text>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.toggleLabel, { color: colors.text }]}>
                  Enable Supermemory
                </Text>
                {profile.supermemoryEnabled && (
                  <Text style={[styles.connectedBadge, { color: colors.accent }]}>
                    ✓ Connected
                  </Text>
                )}
              </View>
              <Pressable
                onPress={handleSmToggle}
                style={({ pressed }) => [
                  styles.toggle,
                  {
                    backgroundColor: profile.supermemoryEnabled
                      ? colors.accent
                      : colors.cardHigh,
                    borderColor: profile.supermemoryEnabled
                      ? colors.accent
                      : colors.borderStrong,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.toggleKnob,
                    {
                      backgroundColor: profile.supermemoryEnabled ? "#0a0a0a" : colors.text,
                      transform: [{ translateX: profile.supermemoryEnabled ? 18 : 0 }],
                    },
                  ]}
                />
              </Pressable>
            </View>

            {profile.supermemoryEnabled && (
              <Pressable
                onPress={() => setSmModalVisible(true)}
                style={({ pressed }) => [
                  styles.reconnectBtn,
                  {
                    backgroundColor: colors.cardAlt,
                    borderColor: colors.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Feather name="refresh-cw" size={13} color={colors.textMuted} />
                <Text style={[styles.reconnectText, { color: colors.textMuted }]}>
                  Update API key
                </Text>
              </Pressable>
            )}
          </Section>

          {/* Data */}
          <Section title="Data">
            <Text style={[styles.helper, { color: colors.mutedForeground }]}>
              Export all your entries and photos as a portable backup. Import a previous backup to restore your journal.
            </Text>

            <View style={styles.dataRow}>
              <DataButton
                icon="upload"
                label={exporting ? "Exporting…" : "Export"}
                onPress={handleExport}
                disabled={exporting}
                colors={colors}
              />
              <DataButton
                icon="download"
                label={importing ? "Importing…" : "Import"}
                onPress={handleImport}
                disabled={importing}
                colors={colors}
              />
            </View>

            <Text style={[styles.helperSmall, { color: colors.textDim }]}>
              Backup includes all text entries and attached photos. Your profile settings are not included.
            </Text>
          </Section>

          {/* About */}
          <Section title="About">
            <Pressable
              onPress={() => router.push("/privacy")}
              style={({ pressed }) => [
                styles.aboutCard,
                {
                  backgroundColor: colors.cardAlt,
                  borderColor: colors.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Feather name="shield" size={14} color={colors.accent} />
              <Text style={[styles.helper, { color: colors.mutedForeground, flex: 1 }]}>
                All journal data is stored locally on this device.{" "}
                <Text style={{ color: colors.accent }}>Read our privacy policy →</Text>
              </Text>
            </Pressable>
            <Text style={[styles.helperSmall, { color: colors.textDim }]}>
              log.af · v1.0.0
            </Text>
          </Section>
        </ScrollView>
      </KeyboardAvoidingView>

      <SupermemorySetupModal visible={smModalVisible} onDone={handleSmDone} />
    </View>
  );
}

// --- Sub-components ---

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={{ gap: 14 }}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{title}</Text>
      {children}
    </View>
  );
}

function DataButton({
  icon,
  label,
  onPress,
  disabled,
  colors,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  onPress: () => void;
  disabled: boolean;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.dataBtn,
        {
          backgroundColor: colors.cardAlt,
          borderColor: colors.border,
          opacity: pressed || disabled ? 0.6 : 1,
        },
      ]}
    >
      <Feather name={icon} size={16} color={colors.text} />
      <Text style={[styles.dataBtnText, { color: colors.text }]}>{label}</Text>
    </Pressable>
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
  sectionTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatarBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: 64, height: 64, borderRadius: 32 },
  link: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  linkMuted: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  fieldLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },
  helper: {
    fontFamily: "Inter_400Regular",
    fontSize: 13.5,
    lineHeight: 20,
  },
  helperSmall: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  toggleLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  connectedBadge: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    letterSpacing: 0.2,
  },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    padding: 2,
    justifyContent: "center",
  },
  toggleKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  reconnectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  reconnectText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  dataRow: {
    flexDirection: "row",
    gap: 10,
  },
  dataBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
  },
  dataBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  aboutCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
});
