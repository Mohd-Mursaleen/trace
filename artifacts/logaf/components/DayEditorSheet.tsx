import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ImageStrip } from "@/components/ImageStrip";
import { Toast } from "@/components/Toast";
import { VoiceRecorderButton } from "@/components/VoiceRecorderButton";
import { useColors } from "@/hooks/useColors";
import { useJournalStore } from "@/hooks/useJournalStore";
import { formatLongDate } from "@/lib/dates";
import { syncToSupermemory } from "@/lib/supermemory";
import type { JournalEntry } from "@/lib/storage";
import { loadProfile } from "@/lib/storage";

type Props = {
  date: string | null;
  visible: boolean;
  onClose: () => void;
};

export function DayEditorSheet({ date, visible, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { loadEntry, saveEntry, deleteEntry } = useJournalStore();

  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [originalEntry, setOriginalEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const dirtyRef = useRef(false);

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
  }

  useEffect(() => {
    if (!visible || !date) return;
    let cancelled = false;
    setLoading(true);
    dirtyRef.current = false;
    (async () => {
      const entry = await loadEntry(date);
      if (cancelled) return;
      setOriginalEntry(entry);
      setText(entry?.text ?? "");
      setImages(entry?.images ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, date, loadEntry]);

  const handleClose = useCallback(() => {
    setText("");
    setImages([]);
    setOriginalEntry(null);
    setSavedFlash(false);
    setToast(null);
    onClose();
  }, [onClose]);

  const handleSave = useCallback(async () => {
    if (!date) return;
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const trimmedText = text;
    const isEmpty = trimmedText.trim().length === 0 && images.length === 0;
    if (isEmpty && originalEntry) {
      await deleteEntry(date);
    } else if (!isEmpty) {
      await saveEntry({
        date,
        text: trimmedText,
        images,
        previewImage: images[0] ?? null,
        createdAt: originalEntry?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Supermemory sync after successful save
      const profile = await loadProfile();
      if (profile.supermemoryEnabled && profile.supermemoryKey && trimmedText.trim()) {
        const result = await syncToSupermemory(profile.supermemoryKey, date, trimmedText);
        if (result.success) {
          showToast("Memory synced ✦ your agent gets smarter");
        } else {
          showToast("Sync failed — saved locally", "error");
        }
      }
    }
    setSaving(false);
    setSavedFlash(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => {
      handleClose();
    }, 380);
  }, [date, text, images, originalEntry, saveEntry, deleteEntry, handleClose]);

  const onTextChange = (v: string) => {
    dirtyRef.current = true;
    setText(v);
  };

  const onImagesChange = (next: string[]) => {
    dirtyRef.current = true;
    setImages(next);
  };

  const appendTranscript = (t: string) => {
    dirtyRef.current = true;
    setText((prev) => {
      if (!prev.trim()) return t;
      const sep = prev.endsWith("\n") || prev.endsWith(" ") ? "" : " ";
      return prev + sep + t;
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
      transparent={false}
    >
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          <View
            style={[
              styles.header,
              {
                borderBottomColor: colors.border,
                paddingTop: Platform.OS === "ios" ? 14 : insets.top + 10,
              },
            ]}
          >
            <Pressable
              onPress={handleClose}
              hitSlop={10}
              style={({ pressed }) => [
                styles.iconBtn,
                {
                  backgroundColor: colors.cardAlt,
                  borderColor: colors.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Feather name="x" size={16} color={colors.text} />
            </Pressable>

            <View style={styles.headerCenter}>
              <Text style={[styles.dateLong, { color: colors.text }]}>
                {date ? formatLongDate(date) : ""}
              </Text>
              <Text style={[styles.dateIso, { color: colors.textDim }]}>
                {date ?? ""}
              </Text>
            </View>

            <Pressable
              onPress={handleSave}
              disabled={saving || loading}
              style={({ pressed }) => [
                styles.saveBtn,
                {
                  backgroundColor: colors.accent,
                  opacity: pressed ? 0.85 : saving || loading ? 0.6 : 1,
                },
              ]}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.accentForeground} />
              ) : savedFlash ? (
                <Feather name="check" size={14} color={colors.accentForeground} />
              ) : null}
              <Text
                style={[
                  styles.saveText,
                  { color: colors.accentForeground },
                ]}
              >
                {savedFlash ? "Saved" : "Save"}
              </Text>
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={[
                styles.content,
                { paddingBottom: insets.bottom + 24 },
              ]}
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
                style={[
                  styles.textarea,
                  {
                    color: colors.text,
                    fontFamily: "Inter_400Regular",
                  },
                ]}
                selectionColor={colors.accent}
              />

              <View style={styles.toolbar}>
                <VoiceRecorderButton onTranscript={appendTranscript} />
              </View>

              <View
                style={[
                  styles.divider,
                  { backgroundColor: colors.border },
                ]}
              />

              <View style={styles.imagesSection}>
                <Text
                  style={[styles.sectionLabel, { color: colors.mutedForeground }]}
                >
                  Photos
                </Text>
                <ImageStrip images={images} onChange={onImagesChange} />
              </View>
            </ScrollView>
          )}
        </KeyboardAvoidingView>

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            visible={!!toast}
            onHide={() => setToast(null)}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  dateLong: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    letterSpacing: -0.2,
  },
  dateIso: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    letterSpacing: 0.8,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  saveText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    letterSpacing: 0.1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    gap: 18,
  },
  textarea: {
    minHeight: 220,
    fontSize: 17,
    lineHeight: 26,
    letterSpacing: 0.1,
    paddingVertical: 4,
  },
  toolbar: {
    paddingTop: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    width: "100%",
    marginVertical: 4,
  },
  imagesSection: {
    gap: 10,
  },
  sectionLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
});
