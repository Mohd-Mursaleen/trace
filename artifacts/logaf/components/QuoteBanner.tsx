import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

const QUOTES = [
  "Your future agent will only be as wise as the memories you give it today.",
  "The best AI that will ever know you is the one you train with your own life.",
  "A daily log is not a diary. It's an API for your future self.",
  "Agents are coming. The ones that truly know you will be the most powerful.",
  "Small moments, recorded. Patterns emerge. Intelligence follows.",
  "The most valuable dataset you'll ever own is the story of your days.",
  "Memory is the foundation of every intelligence — human and artificial.",
  "Write today. In five years, you'll call it training data.",
  "Privacy-first AI starts with data you control. Your journal, your rules.",
  "The future belongs to those who remember it clearly.",
  "One honest entry a day compounds into a lifetime of self-knowledge.",
  "Your context window is unlimited. Use it.",
  "The agent that knows your story will navigate your future.",
  "Every day unlogged is context your agent will never have.",
  "Intelligence without continuity is just computation. Give it yours.",
] as const;

const HOLD_MS = 6000;
const FADE_MS = 600;

export function QuoteBanner() {
  const colors = useColors();
  const [index, setIndex] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const cycle = setInterval(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_MS,
        useNativeDriver: true,
      }).start(() => {
        setIndex((i) => (i + 1) % QUOTES.length);
        Animated.timing(opacity, {
          toValue: 1,
          duration: FADE_MS,
          useNativeDriver: true,
        }).start();
      });
    }, HOLD_MS + FADE_MS * 2);

    return () => clearInterval(cycle);
  }, []);

  const displayIndex = String(index + 1).padStart(2, "0");
  const total = String(QUOTES.length).padStart(2, "0");

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.accentRing,
          // Accent glow — works on iOS; elevation on Android
          shadowColor: colors.accent,
        },
      ]}
    >
      {/* Decorative quote mark */}
      <Text style={[styles.quoteMark, { color: colors.accent }]}>"</Text>

      {/* Quote text */}
      <Animated.Text
        style={[
          styles.quote,
          { color: colors.text, opacity },
        ]}
      >
        {QUOTES[index]}
      </Animated.Text>

      {/* Counter */}
      <Animated.Text
        style={[
          styles.counter,
          { color: colors.textDim, opacity },
        ]}
      >
        {displayIndex} / {total}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 18,
    gap: 12,
    // Glow
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },
  quoteMark: {
    fontFamily: "Inter_700Bold",
    fontSize: 36,
    lineHeight: 32,
    letterSpacing: -1,
    marginBottom: -4,
  },
  quote: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 24,
    letterSpacing: 0.1,
  },
  counter: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    letterSpacing: 1.2,
    textAlign: "right",
  },
});
