import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";

type Props = {
  onTranscript: (text: string) => void;
};

const BTN = 84;
const MIN_BAR = 4;
const BAR_W = 3;

export function BigMicButton({ onTranscript }: Props) {
  const colors = useColors();
  const { state, interim, start, stop } = useVoiceRecorder(onTranscript);

  const isRecording = state === "recording";
  const isProcessing = state === "processing";

  // --- Sonar rings (3 staggered expanding circles) ---
  const r1 = useSharedValue(0);
  const r2 = useSharedValue(0);
  const r3 = useSharedValue(0);

  // --- Button pulse ---
  const pulse = useSharedValue(1);

  // --- Waveform bars (5 bars, animated height) ---
  const b1 = useSharedValue(MIN_BAR);
  const b2 = useSharedValue(MIN_BAR);
  const b3 = useSharedValue(MIN_BAR);
  const b4 = useSharedValue(MIN_BAR);
  const b5 = useSharedValue(MIN_BAR);

  useEffect(() => {
    const ringCfg = { duration: 1800, easing: Easing.out(Easing.cubic) };

    if (isRecording) {
      // Sonar rings
      r1.value = withRepeat(withTiming(1, ringCfg), -1, false);
      r2.value = withDelay(600, withRepeat(withTiming(1, ringCfg), -1, false));
      r3.value = withDelay(1200, withRepeat(withTiming(1, ringCfg), -1, false));

      // Button pulse
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.07, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );

      // Waveform bars — each with different height, speed, phase
      const bar = (v: typeof b1, max: number, dur: number, delay: number) => {
        v.value = withDelay(
          delay,
          withRepeat(
            withSequence(
              withTiming(max, { duration: dur, easing: Easing.inOut(Easing.ease) }),
              withTiming(MIN_BAR, { duration: dur, easing: Easing.inOut(Easing.ease) }),
            ),
            -1,
            false,
          ),
        );
      };
      bar(b1, 20, 220, 0);
      bar(b2, 32, 180, 80);
      bar(b3, 26, 260, 40);
      bar(b4, 18, 200, 120);
      bar(b5, 28, 240, 60);
    } else {
      // Reset all
      [r1, r2, r3].forEach((v) => {
        cancelAnimation(v);
        v.value = withTiming(0, { duration: 250 });
      });
      cancelAnimation(pulse);
      pulse.value = withTiming(1, { duration: 200 });
      [b1, b2, b3, b4, b5].forEach((v) => {
        cancelAnimation(v);
        v.value = withTiming(MIN_BAR, { duration: 200 });
      });
    }
  }, [isRecording]);

  const ringStyle = (v: typeof r1, color: string) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAnimatedStyle(() => ({
      transform: [{ scale: 1 + v.value * 2.2 }],
      opacity: interpolate(v.value, [0, 0.3, 1], [0.55, 0.25, 0]),
      borderColor: color,
    }));

  const ring1Style = ringStyle(r1, isRecording ? colors.recording : colors.accent);
  const ring2Style = ringStyle(r2, isRecording ? colors.recording : colors.accent);
  const ring3Style = ringStyle(r3, isRecording ? colors.recording : colors.accent);

  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const barStyle1 = useAnimatedStyle(() => ({ height: b1.value }));
  const barStyle2 = useAnimatedStyle(() => ({ height: b2.value }));
  const barStyle3 = useAnimatedStyle(() => ({ height: b3.value }));
  const barStyle4 = useAnimatedStyle(() => ({ height: b4.value }));
  const barStyle5 = useAnimatedStyle(() => ({ height: b5.value }));

  const btnBg = isRecording
    ? colors.recording
    : isProcessing
      ? colors.cardHigh
      : colors.accent;

  const iconColor = isRecording || isProcessing ? "#ffffff" : "#0a0a0a";

  // Show live partial transcript while speaking; fall back to static status.
  const statusText = isRecording && interim
    ? interim
    : isRecording
      ? "Listening… tap to stop"
      : isProcessing
        ? "Transcribing…"
        : "Tap to dictate";

  const onPress = async () => {
    if (isProcessing) return;
    Haptics.impactAsync(
      isRecording ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Heavy,
    );
    isRecording ? await stop() : await start();
  };

  return (
    <View style={styles.wrap}>
      {/* Waveform bars — visible when recording or processing */}
      <View style={styles.waveform}>
        {[barStyle1, barStyle2, barStyle3, barStyle4, barStyle5].map((s, i) => (
          <Animated.View
            key={i}
            style={[
              styles.bar,
              s,
              {
                backgroundColor:
                  isRecording
                    ? colors.recording
                    : isProcessing
                      ? colors.textMuted
                      : colors.textDim,
              },
            ]}
          />
        ))}
      </View>

      {/* Status text */}
      <Text
        style={[
          styles.statusText,
          {
            color: isRecording
              ? colors.recording
              : isProcessing
                ? colors.textSecondary
                : colors.textMuted,
          },
        ]}
      >
        {statusText}
      </Text>

      {/* Button + rings */}
      <Pressable onPress={onPress} disabled={isProcessing} style={styles.btnWrap}>
        {/* Sonar rings — absolutely centered */}
        <Animated.View style={[styles.ring, ring3Style]} pointerEvents="none" />
        <Animated.View style={[styles.ring, ring2Style]} pointerEvents="none" />
        <Animated.View style={[styles.ring, ring1Style]} pointerEvents="none" />

        {/* Main button */}
        <Animated.View
          style={[
            styles.btn,
            btnStyle,
            {
              backgroundColor: btnBg,
              // Glow
              shadowColor: isRecording ? colors.recording : colors.accent,
              shadowOpacity: isRecording ? 0.6 : 0.45,
            },
          ]}
        >
          {isProcessing ? (
            <ActivityIndicator color={iconColor} size="small" />
          ) : (
            <Feather
              name={isRecording ? "square" : "mic"}
              size={isRecording ? 24 : 28}
              color={iconColor}
            />
          )}
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 24,
    gap: 14,
  },
  waveform: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    height: 36,
  },
  bar: {
    width: BAR_W,
    borderRadius: 2,
    alignSelf: "flex-end",
  },
  statusText: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 12,
    letterSpacing: 0.4,
  },
  btnWrap: {
    width: BTN * 3,
    height: BTN * 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    borderWidth: 1.5,
  },
  btn: {
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    alignItems: "center",
    justifyContent: "center",
    // Glow
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    elevation: 12,
  },
});
