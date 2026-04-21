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
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
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

        <View style={styles.body}>
          {step === 0 ? (
            <View style={styles.center}>
              <View
                style={[
                  styles.brandMark,
                  { borderColor: colors.borderStrong, backgroundColor: colors.cardAlt },
                ]}
              >
                <Text style={[styles.brandMarkText, { color: colors.text }]}>
                  log<Text style={{ color: colors.accent }}>.</Text>af
                </Text>
              </View>
              <Text style={[styles.title, { color: colors.text }]}>
                Your days, remembered.
              </Text>
              <Text style={[styles.body1, { color: colors.mutedForeground }]}>
                Agents are coming. The ones that truly know you will be the most
                powerful. log.af helps you build that memory — one day at a
                time, entirely on your phone.
              </Text>
            </View>
          ) : null}

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
                  <Feather name="camera" size={28} color={colors.textDim} />
                )}
              </Pressable>

              <Pressable
                onPress={pickPhoto}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.6 : 1,
                  marginTop: 14,
                })}
              >
                <Text style={[styles.linkText, { color: colors.accent }]}>
                  {photoUri ? "Change photo" : "Add a photo"}
                </Text>
              </Pressable>

              <Text style={[styles.title, { color: colors.text, marginTop: 28 }]}>
                Make it yours
              </Text>
              <Text style={[styles.body1, { color: colors.mutedForeground }]}>
                Add a photo and your name. This lives only on your device.
              </Text>

              <TextInput
                value={name}
                onChangeText={setName}
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
          ) : null}

          {step === 2 ? (
            <View style={styles.center}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    borderColor: colors.borderStrong,
                    backgroundColor: colors.cardAlt,
                  },
                ]}
              >
                <Feather name="link" size={26} color={colors.accent} />
              </View>
              <Text style={[styles.title, { color: colors.text, marginTop: 24 }]}>
                Build your agent's memory
              </Text>
              <Text style={[styles.body1, { color: colors.mutedForeground }]}>
                Connect Supermemory to turn your daily logs into a knowledge
                graph — the foundation your future AI agent will think from.
                Free to start, totally optional.
              </Text>

              <View style={styles.toggleRow}>
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
                        backgroundColor: smEnabled ? "#0a0a0b" : colors.text,
                        transform: [{ translateX: smEnabled ? 18 : 0 }],
                      },
                    ]}
                  />
                </Pressable>
                <Text style={[styles.toggleLabel, { color: colors.text }]}>
                  Connect Supermemory
                </Text>
              </View>

              {smEnabled ? (
                <>
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
                  <Text style={[styles.helper, { color: colors.textDim }]}>
                    Get your free key at supermemory.ai
                  </Text>
                </>
              ) : null}
            </View>
          ) : null}
        </View>

        <View
          style={[
            styles.footer,
            { paddingBottom: insets.bottom + 18, paddingHorizontal: 24 },
          ]}
        >
          <Pressable
            onPress={next}
            style={({ pressed }) => [
              styles.cta,
              { backgroundColor: colors.accent, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <Text style={[styles.ctaText, { color: colors.accentForeground }]}>
              {step === 0 ? "Get started" : step === 2 ? "Enter your journal" : "Continue"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
  brandMark: {
    width: 84,
    height: 84,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  brandMarkText: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    letterSpacing: -0.6,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
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
    marginTop: 18,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 22,
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
  toggleLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
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
});
