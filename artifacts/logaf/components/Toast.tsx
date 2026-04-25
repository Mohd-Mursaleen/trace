import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text } from "react-native";

import { useColors } from "@/hooks/useColors";

type ToastProps = {
  message: string;
  type?: "success" | "error";
  visible: boolean;
  onHide: () => void;
};

export function Toast({ message, type = "success", visible, onHide }: ToastProps) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: 10, duration: 200, useNativeDriver: true }),
        ]).start(() => onHide());
      }, 2800);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity,
          transform: [{ translateY }],
          backgroundColor: type === "error" ? colors.cardAlt : colors.card,
          borderColor: type === "error" ? colors.destructive : colors.accent,
        },
      ]}
    >
      <Text
        style={[
          styles.dot,
          { color: type === "error" ? colors.destructive : colors.accent },
        ]}
      >
        {type === "error" ? "✕" : "✦"}
      </Text>
      <Text style={[styles.text, { color: colors.text }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 80,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
    zIndex: 999,
  },
  dot: {
    fontSize: 12,
  },
  text: {
    fontSize: 13,
    fontFamily: "SpaceGrotesk_500Medium",
    letterSpacing: 0.1,
  },
});
