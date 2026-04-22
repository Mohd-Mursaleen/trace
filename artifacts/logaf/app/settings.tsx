import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { fetchProfile, type ProfileResponse } from "@/lib/supermemory";

function getMemberSince(indexDates: string[]): string {
  if (!indexDates.length) return "No entries";
  const earliest = [...indexDates].sort((a, b) => a.localeCompare(b))[0]!;
  const parsed = /^(\d{4})-(\d{2})-(\d{2})$/.exec(earliest);
  if (!parsed) return "No entries";
  const date = new Date(`${parsed[1]}-${parsed[2]}-01T00:00:00.000Z`);
  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, index, updateProfile, copyImageToLocal, refresh } = useJournalStore();

  const [name, setName] = useState(profile.name);
  const [smModalVisible, setSmModalVisible] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [smProfile, setSmProfile] = useState<ProfileResponse["profile"] | null>(null);

  useEffect(() => {
    setName(profile.name);
  }, [profile.name]);

  useEffect(() => {
    if (!profile.supermemoryEnabled || !profile.supermemoryKey) return;

    let cancelled = false;
    setProfileLoading(true);
    fetchProfile(profile.supermemoryKey).then((res) => {
      if (cancelled) return;
      setProfileLoading(false);
      if (res.success && res.data) {
        setSmProfile(res.data.profile);
      } else {
        setSmProfile(null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [profile.supermemoryEnabled, profile.supermemoryKey]);

  const memberSince = useMemo(
    () => getMemberSince(index.map((item) => item.date)),
    [index],
  );

  const initials = useMemo(() => {
    const trimmed = profile.name.trim();
    return trimmed ? trimmed.slice(0, 1).toUpperCase() : "?";
  }, [profile.name]);

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

  const handleSmToggle = async () => {
    if (profile.supermemoryEnabled) {
      await updateProfile({ supermemoryEnabled: false });
      setSmProfile(null);
      return;
    }
    setSmModalVisible(true);
  };

  const handleSmDone = async (key: string | null) => {
    setSmModalVisible(false);
    if (key) {
      await updateProfile({ supermemoryEnabled: true, supermemoryKey: key });
    }
  };

  const handleExport = async () => {
    setExporting(true);
    const result = await exportData();
    setExporting(false);
    if (!result.success && result.error !== "cancelled") {
      Alert.alert("Export failed", result.error ?? "Unknown error");
    }
  };

  const handleImport = async () => {
    setImporting(true);

    const onConflict = (conflictCount: number): Promise<ConflictResolution> =>
      new Promise((resolve) => {
        Alert.alert(
          "Conflicts found",
          `${conflictCount} date${conflictCount > 1 ? "s" : ""} in the backup already exist in your journal. What would you like to do?`,
          [
            { text: "Keep current", onPress: () => resolve("keep") },
            {
              text: "Replace with backup",
              style: "destructive",
              onPress: () => resolve("replace"),
            },
            { text: "Cancel", style: "cancel", onPress: () => resolve("cancel") },
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
            paddingBottom: insets.bottom + 28,
            paddingTop: 10,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.profileCard,
              {
                borderColor: colors.border,
                backgroundColor: colors.card,
              },
            ]}
          >
            <Pressable
              onPress={changePhoto}
              style={[
                styles.heroAvatar,
                {
                  borderColor: "rgba(196,244,65,0.4)",
                  shadowColor: "#c4f441",
                },
              ]}
            >
              {profile.photoUri ? (
                <Image source={{ uri: profile.photoUri }} style={styles.heroAvatarImg} contentFit="cover" />
              ) : (
                <View
                  style={[
                    styles.heroAvatarFallback,
                    { backgroundColor: colors.cardAlt },
                  ]}
                >
                  <Text style={[styles.initials, { color: colors.accent }]}>{initials}</Text>
                </View>
              )}
            </Pressable>

            <Text style={[styles.profileName, { color: colors.text }]}>
              {profile.name.trim() || "Traveller"}
            </Text>
            <Text style={[styles.profileSubtitle, { color: colors.textMuted }]}>
              trace member
            </Text>

            <View
              style={[
                styles.statsRow,
                {
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.statItem,
                  { borderRightColor: colors.border, borderRightWidth: 1 },
                ]}
              >
                <Text style={[styles.statValue, { color: colors.text }]}>{index.length}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>memories</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.text }]}>{memberSince}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>member since</Text>
              </View>
            </View>

            {profile.supermemoryEnabled ? (
              profileLoading ? (
                <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: 16 }} />
              ) : smProfile ? (
                <View style={{ width: "100%", gap: 12, marginTop: 16 }}>
                  {smProfile.dynamic?.[0] ? (
                    <View style={{ gap: 4 }}>
                      <Text style={[styles.metaLabel, { color: colors.textDim }]}>Current vibe</Text>
                      <Text style={[styles.metaBody, { color: colors.textMuted }]}>
                        {smProfile.dynamic[0]}
                      </Text>
                    </View>
                  ) : null}
                  {smProfile.dynamic?.slice(1, 3).length ? (
                    <View style={{ gap: 4 }}>
                      <Text style={[styles.metaLabel, { color: colors.textDim }]}>Recent context</Text>
                      {smProfile.dynamic.slice(1, 3).map((item, i) => (
                        <Text key={i} style={[styles.metaBody, { color: colors.textMuted }]}>
                          - {item}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                </View>
              ) : (
                <Text style={[styles.emptyProfileText, { color: colors.textDim }]}>
                  Not enough memories yet
                </Text>
              )
            ) : null}
          </View>

          <SectionTitle text="Profile" />
          <SectionCard>
            <Row>
              <View style={styles.photoRow}>
                <Pressable
                  onPress={changePhoto}
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                >
                  <Text style={[styles.rowLink, { color: colors.accent }]}>
                    {profile.photoUri ? "Change photo" : "Add photo"}
                  </Text>
                </Pressable>
                {profile.photoUri ? (
                  <Pressable
                    onPress={removePhoto}
                    style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                  >
                    <Text style={[styles.rowSecondaryLink, { color: colors.textMuted }]}>
                      Remove
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </Row>
            <Row>
              <Text style={[styles.inputLabel, { color: colors.textDim }]}>Name</Text>
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
            </Row>
          </SectionCard>

          <SectionTitle text="Supermemory" />
          <SectionCard>
            <Row>
              <View style={styles.toggleRow}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.toggleLabel, { color: colors.text }]}>
                    Enable Supermemory
                  </Text>
                  {profile.supermemoryEnabled ? (
                    <Text style={[styles.connectedBadge, { color: colors.accent }]}>
                      ✓ Connected
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  onPress={handleSmToggle}
                  style={({ pressed }) => [
                    styles.toggle,
                    {
                      backgroundColor: profile.supermemoryEnabled ? colors.accent : colors.cardHigh,
                      borderColor: profile.supermemoryEnabled ? colors.accent : colors.borderStrong,
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
            </Row>
            {profile.supermemoryEnabled ? (
              <Row noBorder>
                <Pressable
                  onPress={() => setSmModalVisible(true)}
                  style={({ pressed }) => [
                    styles.updateBtn,
                    {
                      backgroundColor: colors.cardAlt,
                      borderColor: colors.border,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Feather name="refresh-cw" size={13} color={colors.textMuted} />
                  <Text style={[styles.updateBtnText, { color: colors.textMuted }]}>
                    Update API key
                  </Text>
                </Pressable>
              </Row>
            ) : null}
          </SectionCard>

          <SectionTitle text="Data" />
          <SectionCard>
            <Row>
              <View style={styles.dataRow}>
                <DataButton
                  icon="upload"
                  label={exporting ? "Exporting..." : "Export"}
                  onPress={handleExport}
                  disabled={exporting}
                />
                <DataButton
                  icon="download"
                  label={importing ? "Importing..." : "Import"}
                  onPress={handleImport}
                  disabled={importing}
                />
              </View>
              <Text style={[styles.dataInfo, { color: colors.textDim }]}>
                Backup includes all text entries and attached photos. Your profile settings are not included.
              </Text>
            </Row>
          </SectionCard>

          <SectionTitle text="About" />
          <SectionCard>
            <Row>
              <Pressable
                onPress={() => router.push("/privacy")}
                style={({ pressed }) => [styles.privacyRow, { opacity: pressed ? 0.75 : 1 }]}
              >
                <Feather name="shield" size={14} color={colors.accent} />
                <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
                  Read our privacy policy
                </Text>
                <Feather name="chevron-right" size={14} color={colors.textMuted} />
              </Pressable>
            </Row>
            <Row noBorder>
              <Text style={[styles.versionText, { color: colors.textDim }]}>trace · v1.0.0</Text>
            </Row>
          </SectionCard>

          {__DEV__ ? (
            <Pressable
              onPress={async () => {
                await AsyncStorage.clear();
                await router.replace("/onboarding");
              }}
              style={({ pressed }) => ({
                marginHorizontal: 16,
                marginTop: 24,
                alignItems: "center",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ color: "red", fontSize: 12 }}>Reset app (dev only)</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <SupermemorySetupModal visible={smModalVisible} onDone={handleSmDone} />
    </View>
  );
}

function SectionTitle({ text }: { text: string }) {
  const colors = useColors();
  return <Text style={[styles.sectionTitle, { color: colors.textDim }]}>{text}</Text>;
}

function SectionCard({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.sectionCard,
        {
          borderColor: colors.border,
          backgroundColor: colors.card,
        },
      ]}
    >
      {children}
    </View>
  );
}

function Row({ children, noBorder = false }: { children: React.ReactNode; noBorder?: boolean }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.row,
        !noBorder && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
      ]}
    >
      {children}
    </View>
  );
}

function DataButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  onPress: () => void;
  disabled: boolean;
}) {
  const colors = useColors();
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
    paddingBottom: 12,
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
  profileCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    padding: 24,
    alignItems: "center",
  },
  heroAvatar: {
    width: 88,
    height: 88,
    borderRadius: 24,
    borderWidth: 1.5,
    overflow: "hidden",
    marginBottom: 16,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  heroAvatarImg: {
    width: 88,
    height: 88,
  },
  heroAvatarFallback: {
    width: 88,
    height: 88,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  profileName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 20,
    letterSpacing: -0.3,
  },
  profileSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row",
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
    overflow: "hidden",
  },
  statItem: {
    flex: 1,
    padding: 14,
    alignItems: "center",
  },
  statValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
  },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 2,
  },
  metaLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  metaBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },
  emptyProfileText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 16,
    textAlign: "center",
  },
  sectionTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginLeft: 20,
    marginBottom: 8,
    marginTop: 24,
  },
  sectionCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    padding: 14,
    gap: 10,
  },
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLink: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  rowSecondaryLink: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  inputLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
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
  updateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  updateBtnText: {
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
  dataInfo: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  privacyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13.5,
    flex: 1,
  },
  versionText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
});
