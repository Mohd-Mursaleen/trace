/**
 * Write tab inside DayEditorSheet.
 * When the keyboard is open the mic button is hidden — voice and typing don't mix.
 * When text is empty and on-device AI is ready, shows a contextual writing prompt chip.
 */

import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { BigMicButton } from "@/components/BigMicButton";
import { useAI } from "@/hooks/useAI";
import { useColors } from "@/hooks/useColors";

type Props = {
  text: string;
  onTextChange: (v: string) => void;
  onTranscript: (t: string) => void;
  /** Height of the visible keyboard in px; 0 when closed. */
  kbHeight: number;
  /** ISO date string for the current entry — used to generate a date-specific prompt. */
  date?: string | null;
};

export function WriteTab({ text, onTextChange, onTranscript, kbHeight, date }: Props) {
  const colors = useColors();
  const { status, generateWritingPrompt } = useAI();
  const keyboardOpen = kbHeight > 0;

  const [prompt, setPrompt] = useState<string | null>(null);
  const [promptLoading, setPromptLoading] = useState(false);

  // Load writing prompt once when AI becomes ready and text is still empty
  useEffect(() => {
    if (status !== "ready" || !date || text.trim()) return;
    if (prompt || promptLoading) return;

    setPromptLoading(true);
    generateWritingPrompt(date).then((p) => {
      setPrompt(p);
      setPromptLoading(false);
    });
  }, [status, date, text, prompt, promptLoading, generateWritingPrompt]);

  const handlePromptTap = () => {
    if (!prompt) return;
    onTextChange(prompt + " ");
    setPrompt(null);
  };

  const showPromptArea = !text.trim() && !keyboardOpen && (promptLoading || !!prompt);

  return (
    <View style={[styles.writeTab, { paddingBottom: kbHeight }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.writeScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TextInput
          value={text}
          onChangeText={onTextChange}
          placeholder="What happened today?"
          placeholderTextColor={colors.textDim}
          multiline
          textAlignVertical="top"
          style={[styles.textarea, { color: colors.text }]}
          selectionColor={colors.accent}
        />

        {/* Writing prompt chip — only shown when text is empty and AI has a suggestion */}
        {showPromptArea && (
          <View style={styles.promptArea}>
            {promptLoading ? (
              <View style={[styles.promptChip, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                <ActivityIndicator size="small" color={colors.textDim} />
                <Text style={[styles.promptGenerating, { color: colors.textDim }]}>
                  Generating prompt...
                </Text>
              </View>
            ) : prompt ? (
              <Pressable
                onPress={handlePromptTap}
                style={({ pressed }) => [
                  styles.promptChip,
                  {
                    backgroundColor: colors.cardAlt,
                    borderColor: colors.accentRing,
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                <Text style={[styles.promptIcon, { color: colors.accent }]}>✦</Text>
                <Text style={[styles.promptText, { color: colors.textMuted }]} numberOfLines={2}>
                  {prompt}
                </Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </ScrollView>

      {!keyboardOpen && (
        <View style={[styles.micArea, { borderTopColor: colors.border }]}>
          <BigMicButton onTranscript={onTranscript} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  writeTab: {
    flex: 1,
  },
  writeScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 12,
  },
  textarea: {
    minHeight: 120,
    fontSize: 17,
    lineHeight: 26,
    letterSpacing: 0.1,
    fontFamily: "SpaceGrotesk_400Regular",
    paddingVertical: 4,
  },
  promptArea: {
    marginTop: 4,
  },
  promptChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  promptIcon: {
    fontSize: 13,
    lineHeight: 18,
  },
  promptText: {
    flex: 1,
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: 0.1,
  },
  promptGenerating: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 12,
    letterSpacing: 0.2,
  },
  micArea: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 4,
    paddingBottom: 8,
  },
});
