import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
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

type Step = 0 | 1 | 2;

export default function Onboarding() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile, copyImageToLocal } = useJournalStore();

  const [step, setStep] = useState<Step>(0);
  const [name, setName] = useState(profile.name);
  const [photoUri, setPhotoUri] = useState(profile.photoUri);
  const [smEnabled, setSmEnabled] = useState(profile.supermemoryEnabled);
  const [smKey, setSmKey] = useState(profile.supermemoryKey);

  const finish = async () => {
    await updateProfile({
      name: name.trim(),
      photoUri,
      supermemoryEnabled: smEnabled && smKey.trim().length > 0,
      supermemoryKey: smKey.trim(),
      hasCompletedOnboarding: true,
    });
    router.replace("/");
  };

  const next = () => {
    if (step < 2) setStep((step + 1) as Step);
    else finish();
  };

  const skipStep = () => {
    if (step === 1) {
      setName("");
      setPhotoUri("");
    }
    if (step === 2) {
      setSmEnabled(false);
      setSmKey("");
    }
    next();
  };

  const pickPhoto = async () => {
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
    setPhotoUri(local);
  };

  // Step 1 CTA is locked until name is entered
  const ctaDisabled = step === 1 && !name.trim();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <DotGrid />
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Progress dots + skip */}
        <View
          style={[
            styles.topBar,
            { paddingTop: insets.top + 18, paddingHorizontal: 24 },
          ]}
        >
          <View style={styles.dots}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      i === step ? colors.accent : colors.borderStrong,
                    width: i === step ? 22 : 6,
                  },
                ]}
              />
            ))}
          </View>
          {step > 0 ? (
            <Pressable
              onPress={skipStep}
              hitSlop={12}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <Text style={[styles.skipText, { color: colors.mutedForeground }]}>
                Skip
              </Text>
            </Pressable>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        {/* Body */}
        <View style={styles.body}>
          {/* Step 0 — welcome */}
          {step === 0 ? (
            <View style={styles.center}>
              <Image
                source={require("../assets/icon.png")}
                style={styles.brandMark}
                contentFit="cover"
              />
              <Text style={[styles.title, { color: colors.text }]}>
                Your journal. Your agent's memory.
              </Text>
              <Text style={[styles.body1, { color: colors.mutedForeground }]}>
                Most journals are just archives. This one is different — every entry you write becomes part of a knowledge graph your future AI agents will think from.{"\n\n"}Write today. Your agents remember tomorrow.
              </Text>
            </View>
          ) : null}

          {/* Step 1 — profile (TextInput lives in footer to avoid keyboard overlap) */}
          {step === 1 ? (
            <View style={styles.center}>
              <Pressable
                onPress={pickPhoto}
                style={({ pressed }) => [
                  styles.avatarRing,
                  {
                    borderColor: colors.borderStrong,
                    backgroundColor: colors.cardAlt,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                {photoUri ? (
                  <Image
                    source={{ uri: photoUri }}
                    style={styles.avatarImg}
                    contentFit="cover"
                  />
                ) : (
                  <Feather name="user" size={40} color={colors.textDim} />
                )}
              </Pressable>

              <Pressable
                onPress={pickPhoto}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.6 : 1,
                  marginTop: 10,
                })}
              >
                <Text style={[styles.linkText, { color: colors.accent }]}>
                  {photoUri ? "Change photo" : "Add a photo"}
                </Text>
              </Pressable>

              <Text style={[styles.title, { color: colors.text, marginTop: 24 }]}>
                Make it yours
              </Text>
              <Text style={[styles.body1, { color: colors.mutedForeground }]}>
                Add a photo and your name. This lives only on your device.
              </Text>
            </View>
          ) : null}

          {/* Step 2 — Supermemory */}
          {step === 2 ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.smScroll}
              keyboardShouldPersistTaps="handled"
            >
              {/* Logo row: icon ↔ supermemory */}
              <View style={styles.smIconRow}>
                <Image
                  source={require("../assets/icon.png")}
                  style={styles.smBrandMark}
                  contentFit="cover"
                />
                <View style={[styles.smConnector, { backgroundColor: colors.borderStrong }]} />
                <View style={[styles.smLogoWrap, { borderColor: colors.border }]}>
                  <Image
                    source={require("../assets/supermemory.png")}
                    style={styles.smLogo}
                    contentFit="contain"
                  />
                </View>
              </View>

              <Text style={[styles.title, { color: colors.text }]}>
                Build your agent's memory
              </Text>
              <Text style={[styles.body1, { color: colors.mutedForeground }]}>
                Every entry you write becomes part of your personal knowledge graph. Your future AI agents think from this.
              </Text>

              {/* Feature pills */}
              <View style={[styles.smFeatureRow, { borderColor: colors.border, backgroundColor: colors.cardAlt }]}>
                {[
                  { icon: "lock" as const, text: "Your key, your data" },
                  { icon: "cpu" as const, text: "Powers your AI agents" },
                  { icon: "gift" as const, text: "Free to start" },
                ].map((f) => (
                  <View key={f.text} style={styles.smFeature}>
                    <Feather name={f.icon} size={13} color={colors.accent} />
                    <Text style={[styles.smFeatureText, { color: colors.textSecondary }]}>{f.text}</Text>
                  </View>
                ))}
              </View>

              {/* How to get your key */}
              <View style={[styles.stepsCard, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                <Text style={[styles.stepsTitle, { color: colors.text }]}>How to connect</Text>

                <SmStep number="1" colors={colors}>
                  <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                    Open the Supermemory console and create a free account.
                  </Text>
                  <Pressable
                    onPress={() => Linking.openURL("https://console.supermemory.ai/keys?create=false")}
                    style={({ pressed }) => [
                      styles.openBtn,
                      { backgroundColor: colors.accentDim, borderColor: colors.accentRing, opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <Feather name="external-link" size={13} color={colors.accent} />
                    <Text style={[styles.openBtnText, { color: colors.accent }]}>
                      Open Supermemory Console
                    </Text>
                  </Pressable>
                </SmStep>

                <SmStep number="2" colors={colors}>
                  <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                    In the Keys section, tap{" "}
                    <Text style={{ color: colors.text }}>"Create key"</Text>. Copy the key that appears.
                  </Text>
                </SmStep>

                <SmStep number="3" colors={colors} last>
                  <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                    Come back here and paste it below.
                  </Text>
                </SmStep>
              </View>

              {/* Key input */}
              <TextInput
                value={smKey}
                onChangeText={(v) => { setSmKey(v); setSmEnabled(v.trim().length > 0); }}
                placeholder="Paste your API key here…"
                placeholderTextColor={colors.textDim}
                autoCapitalize="none"
                autoCorrect={false}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.cardAlt,
                    borderColor: smKey.trim() ? colors.accentRing : colors.border,
                    color: colors.text,
                    width: "100%",
                    maxWidth: 400,
                  },
                ]}
                selectionColor={colors.accent}
              />
              {smKey.trim() ? (
                <Text style={[styles.helper, { color: colors.accent }]}>
                  ✓ Key will be saved when you continue
                </Text>
              ) : (
                <Text style={[styles.helper, { color: colors.textDim }]}>
                  Optional — you can also add this later in Settings
                </Text>
              )}
            </ScrollView>
          ) : null}
        </View>

        {/* Footer — TextInput for step 1 lives here so KAV pushes it above keyboard */}
        <View
          style={[
            styles.footer,
            { paddingBottom: insets.bottom + 18, paddingHorizontal: 24 },
          ]}
        >
          {step === 1 && (
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={colors.textDim}
              style={[
                styles.input,
                styles.nameInput,
                {
                  backgroundColor: colors.cardAlt,
                  borderColor: name.trim() ? colors.accentRing : colors.border,
                  color: colors.text,
                },
              ]}
              selectionColor={colors.accent}
            />
          )}
          <Pressable
            onPress={ctaDisabled ? undefined : next}
            style={({ pressed }) => [
              styles.cta,
              {
                backgroundColor: ctaDisabled ? colors.cardHigh : colors.accent,
                opacity: pressed && !ctaDisabled ? 0.9 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.ctaText,
                { color: ctaDisabled ? colors.textDim : colors.accentForeground },
              ]}
            >
              {step === 0
                ? "Get started"
                : step === 2
                  ? "Enter your journal"
                  : "Continue"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function SmStep({
  number,
  children,
  colors,
  last = false,
}: {
  number: string;
  children: React.ReactNode;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.smStepRow,
        !last && {
          paddingBottom: 14,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: "rgba(255,255,255,0.06)",
        },
      ]}
    >
      <View
        style={[
          styles.smStepBadge,
          { backgroundColor: colors.accentDim, borderColor: colors.accentRing },
        ]}
      >
        <Text style={[styles.smStepNum, { color: colors.accent }]}>{number}</Text>
      </View>
      <View style={styles.smStepBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 8,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  skipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    letterSpacing: 0.2,
  },
  body: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "center",
  },
  center: {
    alignItems: "center",
    gap: 14,
  },
  // Step 0 — large hero icon
  brandMark: {
    width: 252,
    height: 252,
    borderRadius: 66,
    marginBottom: 24,
    overflow: "hidden",
  },
  // Step 2 — small icon in logo row
  smBrandMark: {
    width: 64,
    height: 64,
    borderRadius: 16,
    overflow: "hidden",
  },
  smIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
  },
  smConnector: {
    width: 28,
    height: 2,
    borderRadius: 1,
    marginHorizontal: 4,
  },
  // Container for supermemory.png (has light background)
  smLogoWrap: {
    backgroundColor: "#f5f6f8",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  smLogo: {
    width: 110,
    height: 28,
  },
  smFeatureRow: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: "space-between",
    width: "100%",
    maxWidth: 360,
    marginTop: 4,
  },
  smFeature: {
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  smFeatureText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    textAlign: "center",
    letterSpacing: 0.1,
  },
  avatarRing: {
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: 116, height: 116, borderRadius: 58 },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 26,
    letterSpacing: -0.6,
    textAlign: "center",
  },
  body1: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: 6,
    maxWidth: 360,
  },
  input: {
    width: "100%",
    maxWidth: 360,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    marginTop: 0,
  },
  nameInput: {
    // no extra top margin — gap comes from footer's gap
  },
  linkText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    letterSpacing: 0.2,
  },
  helper: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 8,
  },
  footer: {
    paddingTop: 12,
    gap: 12,
  },
  cta: {
    paddingVertical: 15,
    borderRadius: 999,
    alignItems: "center",
  },
  ctaText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15.5,
    letterSpacing: 0.1,
  },
  smScroll: {
    alignItems: "center",
    gap: 16,
    paddingBottom: 8,
  },
  stepsCard: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  stepsTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  smStepRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  smStepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  smStepNum: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
  },
  smStepBody: {
    flex: 1,
    gap: 8,
  },
  stepText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
  },
  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  openBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
});
