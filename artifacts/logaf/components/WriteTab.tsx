import { ScrollView, StyleSheet, TextInput, View } from "react-native";

import { BigMicButton } from "@/components/BigMicButton";
import { useColors } from "@/hooks/useColors";

type Props = {
  text: string;
  onTextChange: (v: string) => void;
  onTranscript: (t: string) => void;
  /** Height of the visible keyboard in px; 0 when closed. */
  kbHeight: number;
};

/**
 * Write tab inside DayEditorSheet.
 * When the keyboard is open the mic button is hidden — voice and typing don't mix.
 * paddingBottom shrinks the ScrollView so the cursor stays above the keyboard.
 */
export function WriteTab({ text, onTextChange, onTranscript, kbHeight }: Props) {
  const colors = useColors();
  const keyboardOpen = kbHeight > 0;

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
  },
  textarea: {
    minHeight: 120,
    fontSize: 17,
    lineHeight: 26,
    letterSpacing: 0.1,
    fontFamily: "Inter_400Regular",
    paddingVertical: 4,
  },
  micArea: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 4,
    paddingBottom: 8,
  },
});
