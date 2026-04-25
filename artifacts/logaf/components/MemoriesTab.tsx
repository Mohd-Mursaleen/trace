import { ScrollView, StyleSheet, Text } from "react-native";

import { ImageStrip } from "@/components/ImageStrip";
import { useColors } from "@/hooks/useColors";

type Props = {
  images: string[];
  onImagesChange: (imgs: string[]) => void;
};

/** Memories tab inside DayEditorSheet — shows the photo strip for the entry. */
export function MemoriesTab({ images, onImagesChange }: Props) {
  const colors = useColors();

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.memoriesScroll}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Photos</Text>
      <ImageStrip images={images} onChange={onImagesChange} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  memoriesScroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    gap: 12,
  },
  sectionLabel: {
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
});
