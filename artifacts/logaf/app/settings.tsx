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
import { useColors } from "@/hooks/useColors";
import { useJournalStore } from "@/hooks/useJournalStore";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile, copyImageToLocal } = useJournalStore();

  const [name, setName] = useState(profile.name);
  const [smEnabled, setSmEnabled] = useState(profile.supermemoryEnabled);
  const [smKey, setSmKey] = useState(profile.supermemoryKey);

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

  const saveSupermemory = async () => {
    await updateProfile({
      supermemoryEnabled: smEnabled && smKey.trim().length > 0,
      supermemoryKey: smKey.trim(),
    });
    Alert.alert("Saved", "Supermemory settings updated.");
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
            gap: 24,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                Name
              </Text>
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

          <Section title="Supermemory">
            <Text style={[styles.helper, { color: colors.mutedForeground }]}>
              Turn your journal into a knowledge graph. Free at supermemory.ai
            </Text>

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.text }]}>
                Enable Supermemory
              </Text>
              <Pressable
                onPress={() => setSmEnabled(!smEnabled)}
                style={({ pressed }) => [
                  styles.toggle,
                  {
                    backgroundColor: smEnabled
                      ? colors.accent
                      : colors.cardHigh,
                    borderColor: smEnabled
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
                      backgroundColor: smEnabled ? "#0a0a0a" : colors.text,
                      transform: [{ translateX: smEnabled ? 18 : 0 }],
                    },
                  ]}
                />
              </Pressable>
            </View>

            <View style={{ gap: 8 }}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
                API Key
              </Text>
              <TextInput
                value={smKey}
                onChangeText={setSmKey}
                placeholder="Supermemory API key"
                placeholderTextColor={colors.textDim}
                autoCapitalize="none"
                autoCorrect={false}
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
              <Text style={[styles.helperSmall, { color: colors.textDim }]}>
                Get your free key at supermemory.ai
              </Text>
            </View>

            <Pressable
              onPress={saveSupermemory}
              style={({ pressed }) => [
                styles.saveBtn,
                {
                  backgroundColor: colors.accent,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <Text style={[styles.saveText, { color: colors.accentForeground }]}>
                Save
              </Text>
            </Pressable>
          </Section>

          <Section title="About">
            <View
              style={[
                styles.aboutCard,
                {
                  backgroundColor: colors.cardAlt,
                  borderColor: colors.border,
                },
              ]}
            >
              <Feather name="lock" size={14} color={colors.accent} />
              <Text style={[styles.helper, { color: colors.mutedForeground, flex: 1 }]}>
                All journal data is stored locally on this device.
              </Text>
            </View>
            <Text style={[styles.helperSmall, { color: colors.textDim }]}>
              log.af · v1.0.0
            </Text>
          </Section>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={{ gap: 14 }}>
      <Text
        style={[
          styles.sectionTitle,
          { color: colors.mutedForeground },
        ]}
      >
        {title}
      </Text>
      {children}
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
  },
  toggleLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
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
  saveBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  saveText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    letterSpacing: 0.2,
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
