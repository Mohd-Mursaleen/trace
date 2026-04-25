import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";

type Props = {
  onTranscript: (text: string) => void;
  compact?: boolean;
};

export function VoiceRecorderButton({ onTranscript, compact = false }: Props) {
  const colors = useColors();
  const { state, interim, start, stop } = useVoiceRecorder(onTranscript);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (state === "recording") {
      pulse.value = withRepeat(
        withTiming(1.15, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(1, { duration: 200 });
    }
    return () => cancelAnimation(pulse);
  }, [state, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const isRecording = state === "recording";
  const isProcessing = state === "processing";

  const onPress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isRecording) {
      await stop();
    } else if (!isProcessing) {
      await start();
    }
  };

  // Show live partial transcript while speaking; fall back to static label.
  const label =
    state === "recording" && interim
      ? interim
      : state === "recording"
        ? "Listening… tap to stop"
        : state === "processing"
          ? "Transcribing…"
          : "Hold a thought — tap to dictate";

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <Pressable
        onPress={onPress}
        disabled={isProcessing}
        style={({ pressed }) => [
          styles.btnOuter,
          { opacity: pressed ? 0.85 : 1 },
        ]}
      >
        {isRecording ? (
          <Animated.View
            style={[
              styles.pulseRing,
              { borderColor: colors.recording },
              pulseStyle,
            ]}
            pointerEvents="none"
          />
        ) : null}
        <View
          style={[
            styles.btn,
            {
              backgroundColor: isRecording
                ? colors.recording
                : colors.cardHigh,
              borderColor: isRecording ? colors.recording : colors.borderStrong,
            },
          ]}
        >
          {isProcessing ? (
            <ActivityIndicator color={colors.text} size="small" />
          ) : (
            <Feather
              name={isRecording ? "square" : "mic"}
              size={18}
              color={isRecording ? "#fff" : colors.text}
            />
          )}
        </View>
      </Pressable>
      {!compact && (
        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          {label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  wrapCompact: {
    gap: 0,
  },
  btnOuter: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
  },
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 12.5,
    letterSpacing: 0.1,
    flex: 1,
  },
});
