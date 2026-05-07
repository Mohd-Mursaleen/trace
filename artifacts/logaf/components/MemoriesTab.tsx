/**
 * Memories tab inside DayEditorSheet.
 * Shows the photo strip for the entry.
 * When on-device AI is ready, displays cached descriptions and a "Describe" button per photo.
 */

import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";

import { ImageStrip } from "@/components/ImageStrip";
import { useAI } from "@/hooks/useAI";
import { useColors } from "@/hooks/useColors";

type Props = {
  images: string[];
  onImagesChange: (imgs: string[]) => void;
};

/** Per-photo description state: null = unknown/not cached, string = description, false = generating */
type DescState = Record<string, string | false | null>;

export function MemoriesTab({ images, onImagesChange }: Props) {
  const colors = useColors();
  const { status, describePhoto, getCachedDescription } = useAI();

  const [descriptions, setDescriptions] = useState<DescState>({});

  // Load cached descriptions for all images when AI is ready
  useEffect(() => {
    if (status === "disabled" || images.length === 0) return;
    images.forEach((uri) => {
      if (descriptions[uri] !== undefined) return; // already loaded
      getCachedDescription(uri).then((cached) => {
        setDescriptions((prev) => ({ ...prev, [uri]: cached ?? null }));
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, images]);

  const handleDescribe = async (uri: string) => {
    if (status !== "ready") return;
    setDescriptions((prev) => ({ ...prev, [uri]: false })); // false = generating
    const desc = await describePhoto(uri);
    setDescriptions((prev) => ({ ...prev, [uri]: desc ?? null }));
  };

  const aiVisible = status !== "disabled" && images.length > 0;

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.memoriesScroll}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Photos</Text>
      <ImageStrip images={images} onChange={onImagesChange} />

      {/* AI descriptions — only shown when AI is enabled and photos exist */}
      {aiVisible && (
        <View style={styles.aiSection}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            AI Descriptions
          </Text>
          <View style={styles.descList}>
            {images.map((uri) => {
              const desc = descriptions[uri];
              const generating = desc === false;
              const cached = typeof desc === "string";

              return (
                <View
                  key={uri}
                  style={[styles.descRow, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
                >
                  <Image source={{ uri }} style={styles.thumb} contentFit="cover" />
                  <View style={styles.descBody}>
                    {generating ? (
                      <View style={styles.generatingRow}>
                        <ActivityIndicator size="small" color={colors.textDim} />
                        <Text style={[styles.generatingText, { color: colors.textDim }]}>
                          Describing...
                        </Text>
                      </View>
                    ) : cached ? (
                      <Text style={[styles.descText, { color: colors.textMuted }]}>
                        {desc}
                      </Text>
                    ) : status === "ready" ? (
                      <Pressable
                        onPress={() => void handleDescribe(uri)}
                        style={({ pressed }) => [
                          styles.describeBtn,
                          { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                        ]}
                      >
                        <Text style={[styles.describeBtnText, { color: colors.accent }]}>
                          ✦ Describe
                        </Text>
                      </Pressable>
                    ) : (
                      <Text style={[styles.generatingText, { color: colors.textDim }]}>
                        AI loading...
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}
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
  aiSection: {
    gap: 8,
    marginTop: 4,
  },
  descList: {
    gap: 8,
  },
  descRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    flexShrink: 0,
  },
  descBody: {
    flex: 1,
    justifyContent: "center",
  },
  descText: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: 0.1,
  },
  generatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  generatingText: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 12,
    letterSpacing: 0.2,
  },
  describeBtn: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  describeBtnText: {
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 12,
    letterSpacing: 0.3,
  },
});
