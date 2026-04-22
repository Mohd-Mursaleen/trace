/**
 * User-friendly modal that walks someone through connecting their Supermemory account.
 * Opens the Supermemory console in-app, lets them paste their API key,
 * validates it immediately, then saves on success.
 */
import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { SupermemoryLogo } from "@/components/SupermemoryLogo";
import { useColors } from "@/hooks/useColors";
import { validateSupermemoryKey } from "@/lib/supermemory";

const SUPERMEMORY_URL = "https://console.supermemory.ai/keys?create=false";

type Props = {
  visible: boolean;
  /** Called with the verified key on success, or null if user cancels */
  onDone: (key: string | null) => void;
};

type Status = "idle" | "verifying" | "success" | "error";

export function SupermemorySetupModal({ visible, onDone }: Props) {
  const colors = useColors();
  const [key, setKey] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const reset = () => {
    setKey("");
    setStatus("idle");
    setErrorMsg("");
  };

  const handleCancel = () => {
    reset();
    onDone(null);
  };

  const openConsole = async () => {
    try {
      await Linking.openURL(SUPERMEMORY_URL);
    } catch {
      // Silently ignore — URL open failures are non-critical
    }
  };

  const handleVerify = async () => {
    const trimmed = key.trim();
    if (!trimmed) {
      setErrorMsg("Paste your API key first.");
      setStatus("error");
      return;
    }
    setStatus("verifying");
    setErrorMsg("");
    const result = await validateSupermemoryKey(trimmed);
    if (result.valid) {
      setStatus("success");
      // Brief moment to show success, then hand off
      setTimeout(() => {
        reset();
        onDone(trimmed);
      }, 900);
    } else {
      setStatus("error");
      setErrorMsg(result.error ?? "Key is invalid. Check the key and try again.");
    }
  };

  const verifyLabel =
    status === "verifying"
      ? "Verifying…"
      : status === "success"
        ? "Connected!"
        : "Verify & Connect";

  const verifyBg =
    status === "success"
      ? "#22c55e"
      : status === "error"
        ? colors.destructive
        : colors.accent;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
      transparent={false}
    >
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable
            onPress={handleCancel}
            hitSlop={10}
            style={({ pressed }) => [
              styles.iconBtn,
              {
                backgroundColor: colors.cardAlt,
                borderColor: colors.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Feather name="x" size={15} color={colors.text} />
          </Pressable>
          <SupermemoryLogo color={colors.text} scale={0.72} />
          <View style={{ width: 32 }} />
        </View>

        <View style={styles.body}>
          {/* What it does */}
          <View style={[styles.infoCard, { backgroundColor: colors.cardAlt, borderColor: colors.accentRing }]}>
            <Text style={[styles.infoTitle, { color: colors.accent }]}>
              What this does
            </Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Every journal entry you save gets added to your personal Supermemory knowledge graph — making your AI agents smarter over time. Your data lives in your own account; log.af never touches it.
            </Text>
          </View>

          {/* Steps */}
          <View style={styles.steps}>
            <Step
              number="1"
              title="Open Supermemory"
              description="Tap the button below to open the Supermemory console."
              colors={colors}
              action={
                <Pressable
                  onPress={openConsole}
                  style={({ pressed }) => [
                    styles.openBtn,
                    {
                      backgroundColor: colors.cardAlt,
                      borderColor: colors.border,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Feather name="external-link" size={14} color={colors.accent} />
                  <Text style={[styles.openBtnText, { color: colors.accent }]}>
                    Open Supermemory Console
                  </Text>
                </Pressable>
              }
            />

            <Step
              number="2"
              title="Create a free account"
              description="Sign up if you don't have an account. It's free."
              colors={colors}
            />

            <Step
              number="3"
              title="Create an API key"
              description={'In the Keys section, tap "Create key". Copy the key that appears.'}
              colors={colors}
            />

            <Step
              number="4"
              title="Paste your key here"
              description="Come back to log.af and paste the key below."
              colors={colors}
              action={
                <View style={styles.keyInputWrap}>
                  <TextInput
                    value={key}
                    onChangeText={(v) => {
                      setKey(v);
                      if (status !== "idle") { setStatus("idle"); setErrorMsg(""); }
                    }}
                    placeholder="Paste API key…"
                    placeholderTextColor={colors.textDim}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[
                      styles.keyInput,
                      {
                        backgroundColor: colors.cardAlt,
                        borderColor:
                          status === "error"
                            ? colors.destructive
                            : status === "success"
                              ? "#22c55e"
                              : colors.border,
                        color: colors.text,
                      },
                    ]}
                    selectionColor={colors.accent}
                  />
                  {status === "error" && (
                    <Text style={[styles.errorText, { color: colors.destructive }]}>
                      {errorMsg}
                    </Text>
                  )}
                </View>
              }
            />
          </View>

          {/* Verify button */}
          <Pressable
            onPress={handleVerify}
            disabled={status === "verifying" || status === "success"}
            style={({ pressed }) => [
              styles.verifyBtn,
              {
                backgroundColor: verifyBg,
                opacity: pressed ? 0.88 : 1,
              },
            ]}
          >
            {status === "verifying" ? (
              <ActivityIndicator size="small" color="#0a0a0a" />
            ) : status === "success" ? (
              <Feather name="check" size={16} color="#0a0a0a" />
            ) : null}
            <Text style={styles.verifyBtnText}>{verifyLabel}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// --- Step sub-component ---

function Step({
  number,
  title,
  description,
  action,
  colors,
}: {
  number: string;
  title: string;
  description: string;
  action?: React.ReactNode;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  return (
    <View style={styles.step}>
      <View style={[styles.stepBadge, { backgroundColor: colors.accentDim, borderColor: colors.accentRing }]}>
        <Text style={[styles.stepNumber, { color: colors.accent }]}>{number}</Text>
      </View>
      <View style={styles.stepBody}>
        <Text style={[styles.stepTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>{description}</Text>
        {action ?? null}
      </View>
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
    paddingVertical: 14,
    paddingTop: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    letterSpacing: -0.2,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 24,
  },
  infoCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  infoTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    letterSpacing: 0.2,
  },
  infoText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },
  steps: {
    gap: 20,
  },
  step: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  stepNumber: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  stepBody: {
    flex: 1,
    gap: 4,
  },
  stepTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  stepDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
  },
  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 6,
  },
  openBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  keyInputWrap: {
    gap: 6,
    marginTop: 6,
  },
  keyInput: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  errorText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  verifyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  verifyBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#0a0a0a",
  },
});
