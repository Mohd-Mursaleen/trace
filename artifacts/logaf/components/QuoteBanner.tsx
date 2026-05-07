/**
 * QuoteBanner — home screen insight card.
 * When on-device AI is ready: shows a generated weekly summary (changes each week).
 * When AI is disabled / generating: falls back to the static rotating quote list.
 */

import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import { useAI } from "@/hooks/useAI";
import { useColors } from "@/hooks/useColors";
import { useRotatingIndex } from "@/hooks/useRotatingIndex";

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

/** Fade-in animation for the AI summary (runs once on mount). */
function useOnceOpacity(active: boolean): Animated.Value {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) return;
    Animated.timing(anim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [active, anim]);
  return anim;
}

export function QuoteBanner() {
  const colors = useColors();
  const { status, generateWeeklySummary } = useAI();

  // AI summary state
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiAttempted, setAiAttempted] = useState(false);

  // Fallback rotating quotes (always computed, conditionally rendered)
  const [quoteIndex, quoteOpacity] = useRotatingIndex(
    QUOTES.length,
    HOLD_MS + FADE_MS * 2,
    FADE_MS,
  );

  const summaryOpacity = useOnceOpacity(!!aiSummary);

  // Attempt summary generation when engine becomes ready
  useEffect(() => {
    if (status !== "ready" || aiAttempted) return;
    setAiAttempted(true);
    generateWeeklySummary().then((s) => setAiSummary(s));
  }, [status, aiAttempted, generateWeeklySummary]);

  const showAI = !!aiSummary;

  const displayIndex = String(quoteIndex + 1).padStart(2, "0");
  const total = String(QUOTES.length).padStart(2, "0");

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.accentRing,
          shadowColor: colors.accent,
        },
      ]}
    >
      {/* Decorative mark — " for quotes, ✦ for AI summary */}
      <Text style={[styles.quoteMark, { color: colors.accent }]}>
        {showAI ? "✦" : '"'}
      </Text>

      {/* Content area — fixed height so the card never resizes */}
      <View style={styles.quoteWrap}>
        {showAI ? (
          <Animated.Text
            style={[styles.quote, { color: colors.text, opacity: summaryOpacity }]}
          >
            {aiSummary}
          </Animated.Text>
        ) : (
          <Animated.Text
            style={[styles.quote, { color: colors.text, opacity: quoteOpacity }]}
          >
            {QUOTES[quoteIndex]}
          </Animated.Text>
        )}
      </View>

      {/* Footer label */}
      {showAI ? (
        <Text style={[styles.counter, { color: colors.accent }]}>
          this week
        </Text>
      ) : (
        <Animated.Text
          style={[styles.counter, { color: colors.textDim, opacity: quoteOpacity }]}
        >
          {displayIndex} / {total}
        </Animated.Text>
      )}
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
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },
  quoteMark: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 36,
    lineHeight: 32,
    letterSpacing: -1,
    marginBottom: -4,
  },
  quoteWrap: {
    // 3 lines × lineHeight 24 — tall enough for the longest quote/summary
    height: 72,
    justifyContent: "center",
  },
  quote: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 15,
    lineHeight: 24,
    letterSpacing: 0.1,
  },
  counter: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 10,
    letterSpacing: 1.2,
    textAlign: "right",
  },
});
