import { Image } from "expo-image";
import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useJournalStore } from "@/hooks/useJournalStore";
import type { SearchResult } from "@/lib/supermemory";
import type { JournalEntry } from "@/lib/storage";

type Props = {
  result: SearchResult | null;
  visible: boolean;
  onClose: () => void;
  localEntry?: JournalEntry | null;
};

function formatDisplayDate(input?: string): string {
  if (!input) return "Unknown date";
  const d = new Date(input);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }
  const isoDate = /^(\d{4})-(\d{2})-(\d{2})/.exec(input);
  if (isoDate) {
    const parsed = new Date(`${isoDate[1]}-${isoDate[2]}-${isoDate[3]}T00:00:00.000Z`);
    return parsed.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  }
  return input;
}

export function SearchResultSheet({ result, visible, onClose, localEntry }: Props) {
  const colors = useColors();
  const { height } = useWindowDimensions();
  const { loadEntry } = useJournalStore();
  const [resolvedEntry, setResolvedEntry] = useState<JournalEntry | null>(localEntry ?? null);

  const dateValue = result?.metadata?.date ?? result?.updatedAt ?? "";

  useEffect(() => {
    setResolvedEntry(localEntry ?? null);
  }, [localEntry]);

  useEffect(() => {
    const date = result?.metadata?.date;
    if (!visible || !result || !date) return;

    let cancelled = false;
    (async () => {
      const entry = await loadEntry(date);
      if (!cancelled) setResolvedEntry(entry);
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, result, loadEntry]);

  const contentText = useMemo(
    () => resolvedEntry?.text || result?.memory || result?.chunk || "",
    [resolvedEntry, result],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border, height: height * 0.9 }]}>
          <View
            style={[
              styles.handle,
              { backgroundColor: colors.borderStrong },
            ]}
          />

          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={[styles.closeText, { color: colors.textMuted }]}>Close</Text>
          </Pressable>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.dateLabel, { color: colors.accent }]}>
              {formatDisplayDate(dateValue)}
            </Text>

            <View style={[styles.separator, { backgroundColor: colors.border }]} />

            <Text style={[styles.bodyText, { color: colors.text }]}>{contentText}</Text>

            {resolvedEntry?.images?.length ? (
              <>
                <View style={[styles.separator, { backgroundColor: colors.border, marginTop: 26 }]} />
                <Text style={[styles.photosLabel, { color: colors.textDim }]}>PHOTOS</Text>
                {resolvedEntry.images.map((uri, index) => (
                  <Image
                    key={`${uri}-${index}`}
                    source={{ uri }}
                    style={styles.photo}
                    contentFit="cover"
                  />
                ))}
              </>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    overflow: "hidden",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 20,
  },
  closeBtn: {
    alignSelf: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  closeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    letterSpacing: 0.2,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  dateLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  separator: {
    height: 1,
    opacity: 0.8,
    marginVertical: 16,
  },
  bodyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    lineHeight: 28,
    letterSpacing: 0.1,
  },
  photosLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  photo: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    marginTop: 16,
  },
});
