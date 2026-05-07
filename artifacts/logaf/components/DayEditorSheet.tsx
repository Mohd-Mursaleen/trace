import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MemoriesTab } from "@/components/MemoriesTab";
import { Toast } from "@/components/Toast";
import { WriteTab } from "@/components/WriteTab";
import { useAutosave } from "@/hooks/useAutosave";
import { useColors } from "@/hooks/useColors";
import { useJournalStore } from "@/hooks/useJournalStore";
import { formatLongDate } from "@/lib/dates";
import { loadProfile } from "@/lib/storage";
import type { JournalEntry } from "@/lib/storage";
import { syncToSupermemory } from "@/lib/supermemory";

const SHEET_RATIO = 0.72;

type Props = {
  date: string | null;
  visible: boolean;
  onClose: () => void;
};

type Tab = "write" | "memories";

export function DayEditorSheet({ date, visible, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const { loadEntry, saveEntry, deleteEntry } = useJournalStore();

  const sheetHeight = screenHeight * SHEET_RATIO;

  // --- Animation ---
  const translateY = useRef(new Animated.Value(sheetHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);

  // --- Keyboard ---
  const [kbHeight, setKbHeight] = useState(0);

  // --- Content state ---
  const [tab, setTab] = useState<Tab>("write");
  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [originalEntry, setOriginalEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Single ref: marks content dirty without causing a re-render.
  const dirtyRef = useRef(false);

  // --- Autosave (extracts interval + autoSaved state; no stale-closure refs needed) ---
  const { autoSaved } = useAutosave({
    active: visible && !loading,
    date,
    text,
    images,
    originalEntry,
    dirtyRef,
    saveEntry,
  });

  // --- Sheet open/close animation ---
  useEffect(() => {
    if (visible) {
      setMounted(true);
      setTab("write");
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          damping: 20,
          stiffness: 180,
          mass: 1,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: sheetHeight,
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => setMounted(false));
    }
  }, [visible, sheetHeight]);

  // --- Keyboard: shrink content so header + text stay visible ---
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const onShow = Keyboard.addListener(showEvent, (e) => setKbHeight(e.endCoordinates.height));
    const onHide = Keyboard.addListener(hideEvent, () => setKbHeight(0));
    return () => { onShow.remove(); onHide.remove(); };
  }, []);

  // --- Load entry when sheet opens ---
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
    return () => { cancelled = true; };
  }, [visible, date, loadEntry]);

  // --- Cleanup helper ---
  const cleanup = useCallback(() => {
    setText("");
    setImages([]);
    setOriginalEntry(null);
    setSavedFlash(false);
    setToast(null);
  }, []);

  // --- Close: save locally + fire-and-forget Supermemory sync ---
  // useCallback deps include text/images so it always captures the latest content.
  const handleClose = useCallback(async () => {
    if (date && dirtyRef.current) {
      const isEmpty = text.trim().length === 0 && images.length === 0;
      if (isEmpty && originalEntry) {
        deleteEntry(date);
      } else if (!isEmpty) {
        const entry: JournalEntry = {
          date,
          text,
          images,
          previewImage: images[0] ?? null,
          createdAt: originalEntry?.createdAt ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        saveEntry(entry);
        loadProfile().then((profile) => {
          if (profile.supermemoryEnabled && profile.supermemoryKey?.trim() && text.trim()) {
            syncToSupermemory(profile.supermemoryKey, date, text).then((result) => {
              if (__DEV__) console.log("[supermemory] bg sync on close:", result);
            });
          }
        });
      }
    }
    cleanup();
    onClose();
  }, [date, text, images, originalEntry, saveEntry, deleteEntry, cleanup, onClose]);

  // --- Save button: awaits Supermemory, shows toast, closes ---
  const handleSave = useCallback(async () => {
    if (!date) return;
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const isEmpty = text.trim().length === 0 && images.length === 0;
    if (isEmpty && originalEntry) {
      await deleteEntry(date);
    } else if (!isEmpty) {
      await saveEntry({
        date,
        text,
        images,
        previewImage: images[0] ?? null,
        createdAt: originalEntry?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      dirtyRef.current = false;
      try {
        const profile = await loadProfile();
        if (profile.supermemoryEnabled && profile.supermemoryKey?.trim() && text.trim()) {
          const result = await syncToSupermemory(profile.supermemoryKey, date, text);
          if (__DEV__) console.log("[supermemory] sync on save:", result);
          setToast(
            result.success
              ? { message: "Memory synced ✦ your agent gets smarter", type: "success" }
              : { message: "Sync failed — saved locally", type: "error" },
          );
        }
      } catch (e: unknown) {
        if (__DEV__) console.warn("[supermemory] unexpected error:", e);
      }
    }
    setSaving(false);
    setSavedFlash(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => {
      cleanup();
      onClose();
    }, 380);
  }, [date, text, images, originalEntry, saveEntry, deleteEntry, cleanup, onClose]);

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

  if (!mounted) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      <Animated.View
        style={[styles.backdrop, { opacity: backdropOpacity }]}
        pointerEvents={visible ? "auto" : "none"}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            height: sheetHeight,
            backgroundColor: colors.card,
            borderColor: colors.border,
            paddingBottom: insets.bottom,
            transform: [{ translateY }],
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          {/* Handle bar */}
          <View style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
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
              <Feather name="x" size={15} color={colors.text} />
            </Pressable>

            <View style={styles.headerCenter}>
              <Text style={[styles.dateText, { color: colors.text }]}>
                {date ? formatLongDate(date) : ""}
              </Text>
              {autoSaved ? (
                <Text style={[styles.subText, { color: colors.accent }]}>autosaved ✓</Text>
              ) : (
                <Text style={[styles.subText, { color: colors.textSecondary }]}>{date ?? ""}</Text>
              )}
            </View>

            <Pressable
              onPress={handleSave}
              disabled={saving || loading}
              style={({ pressed }) => [
                styles.saveBtn,
                {
                  backgroundColor: colors.accent,
                  opacity: pressed ? 0.85 : saving || loading ? 0.5 : 1,
                },
              ]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#0a0a0a" />
              ) : savedFlash ? (
                <Feather name="check" size={14} color="#0a0a0a" />
              ) : null}
              <Text style={styles.saveBtnText}>{savedFlash ? "Saved" : "Save"}</Text>
            </Pressable>
          </View>

          {/* Tab toggle */}
          <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
            {(["write", "memories"] as Tab[]).map((t) => (
              <Pressable
                key={t}
                onPress={() => setTab(t)}
                style={[
                  styles.tabItem,
                  tab === t && { borderBottomColor: colors.accent, borderBottomWidth: 2 },
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color: tab === t ? colors.accent : colors.textMuted,
                      fontFamily: tab === t ? "SpaceGrotesk_600SemiBold" : "SpaceGrotesk_400Regular",
                    },
                  ]}
                >
                  {t === "write" ? "Write" : "Memories"}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Tab content */}
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : tab === "write" ? (
            <WriteTab
              text={text}
              onTextChange={onTextChange}
              onTranscript={appendTranscript}
              kbHeight={kbHeight}
              date={date}
            />
          ) : (
            <MemoriesTab images={images} onImagesChange={onImagesChange} />
          )}
        </View>

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            visible={!!toast}
            onHide={() => setToast(null)}
          />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  handleWrap: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  dateText: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 15,
    letterSpacing: -0.2,
  },
  subText: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 11,
    letterSpacing: 0.6,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  saveBtnText: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 13,
    color: "#0a0a0a",
    letterSpacing: 0.1,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: {
    fontSize: 13,
    letterSpacing: 0.2,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
