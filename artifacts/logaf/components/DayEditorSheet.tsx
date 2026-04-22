import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BigMicButton } from "@/components/BigMicButton";
import { ImageStrip } from "@/components/ImageStrip";
import { Toast } from "@/components/Toast";
import { useColors } from "@/hooks/useColors";
import { useJournalStore } from "@/hooks/useJournalStore";
import { formatLongDate } from "@/lib/dates";
import { loadProfile } from "@/lib/storage";
import type { JournalEntry } from "@/lib/storage";
import { syncToSupermemory } from "@/lib/supermemory";

const AUTOSAVE_INTERVAL_MS = 5_000;
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

  // --- Animation state ---
  const translateY = useRef(new Animated.Value(sheetHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);

  // --- Keyboard state (plain, not animated — paddingBottom handles the layout) ---
  const [kbHeight, setKbHeight] = useState(0);

  // --- Content state ---
  const [tab, setTab] = useState<Tab>("write");
  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [originalEntry, setOriginalEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Refs to avoid stale closures in interval/async callbacks
  const dirtyRef = useRef(false);
  const textRef = useRef("");
  const imagesRef = useRef<string[]>([]);
  const originalEntryRef = useRef<JournalEntry | null>(null);
  const dateRef = useRef<string | null>(null);
  const autoSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep refs in sync with state
  useEffect(() => { textRef.current = text; }, [text]);
  useEffect(() => { imagesRef.current = images; }, [images]);
  useEffect(() => { originalEntryRef.current = originalEntry; }, [originalEntry]);
  useEffect(() => { dateRef.current = date; }, [date]);

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

  // --- Keyboard: shrink content inside the sheet so header + text stay visible ---
  // The sheet stays anchored at bottom: 0. We add paddingBottom = kbHeight so
  // the ScrollView shrinks and the mic button is hidden while typing.
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
    setAutoSaved(false);
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

  // --- Autosave every 5s ---
  useEffect(() => {
    if (!visible || loading) return;
    const interval = setInterval(async () => {
      if (!dirtyRef.current || !dateRef.current) return;
      const t = textRef.current;
      const imgs = imagesRef.current;
      if (t.trim().length === 0 && imgs.length === 0) return;
      try {
        await saveEntry({
          date: dateRef.current,
          text: t,
          images: imgs,
          previewImage: imgs[0] ?? null,
          createdAt: originalEntryRef.current?.createdAt ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        dirtyRef.current = false;
        setAutoSaved(true);
        if (autoSavedTimerRef.current) clearTimeout(autoSavedTimerRef.current);
        autoSavedTimerRef.current = setTimeout(() => setAutoSaved(false), 2000);
      } catch {
        // Silent — non-critical, Save button still works
      }
    }, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [visible, loading, saveEntry]);

  // --- Cleanup helper ---
  const cleanup = useCallback(() => {
    setText("");
    setImages([]);
    setOriginalEntry(null);
    setSavedFlash(false);
    setAutoSaved(false);
    setToast(null);
    if (autoSavedTimerRef.current) clearTimeout(autoSavedTimerRef.current);
  }, []);

  // --- X / backdrop close: save locally + fire-and-forget Supermemory ---
  const handleClose = useCallback(async () => {
    if (dateRef.current && dirtyRef.current) {
      const t = textRef.current;
      const imgs = imagesRef.current;
      const isEmpty = t.trim().length === 0 && imgs.length === 0;
      if (isEmpty && originalEntryRef.current) {
        deleteEntry(dateRef.current);
      } else if (!isEmpty) {
        const entry: JournalEntry = {
          date: dateRef.current,
          text: t,
          images: imgs,
          previewImage: imgs[0] ?? null,
          createdAt: originalEntryRef.current?.createdAt ?? new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        saveEntry(entry);
        loadProfile().then((profile) => {
          if (profile.supermemoryEnabled && profile.supermemoryKey?.trim() && t.trim()) {
            syncToSupermemory(profile.supermemoryKey, dateRef.current!, t).then((result) => {
              console.log("[supermemory] bg sync on close:", result);
            });
          }
        });
      }
    }
    cleanup();
    onClose();
  }, [cleanup, onClose, deleteEntry, saveEntry]);

  // --- Save button: awaits Supermemory, shows toast, closes ---
  const handleSave = useCallback(async () => {
    if (!date) return;
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const t = text;
    const imgs = images;
    const isEmpty = t.trim().length === 0 && imgs.length === 0;
    if (isEmpty && originalEntry) {
      await deleteEntry(date);
    } else if (!isEmpty) {
      await saveEntry({
        date,
        text: t,
        images: imgs,
        previewImage: imgs[0] ?? null,
        createdAt: originalEntry?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      dirtyRef.current = false;
      try {
        const profile = await loadProfile();
        if (profile.supermemoryEnabled && profile.supermemoryKey?.trim() && t.trim()) {
          const result = await syncToSupermemory(profile.supermemoryKey, date, t);
          console.log("[supermemory] sync on save:", result);
          setToast(
            result.success
              ? { message: "Memory synced ✦ your agent gets smarter", type: "success" }
              : { message: "Sync failed — saved locally", type: "error" },
          );
        }
      } catch (e) {
        console.warn("[supermemory] unexpected error:", e);
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
                      fontFamily: tab === t ? "Inter_600SemiBold" : "Inter_400Regular",
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
              colors={colors}
              kbHeight={kbHeight}
            />
          ) : (
            <MemoriesTab
              images={images}
              onImagesChange={onImagesChange}
              colors={colors}
              insetBottom={0}
            />
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

// --- Write tab ---
// kbHeight > 0 means the keyboard is open.
// We add paddingBottom so the ScrollView shrinks and the cursor stays visible.
// The mic button is hidden while keyboard is open — voice and typing don't mix.
function WriteTab({
  text,
  onTextChange,
  onTranscript,
  colors,
  kbHeight,
}: {
  text: string;
  onTextChange: (v: string) => void;
  onTranscript: (t: string) => void;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  kbHeight: number;
}) {
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

      {/* Mic button — hidden when keyboard is open */}
      {!keyboardOpen && (
        <View style={[styles.micArea, { borderTopColor: colors.border }]}>
          <BigMicButton onTranscript={onTranscript} />
        </View>
      )}
    </View>
  );
}

// --- Memories tab ---
function MemoriesTab({
  images,
  onImagesChange,
  colors,
  insetBottom,
}: {
  images: string[];
  onImagesChange: (imgs: string[]) => void;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  insetBottom: number;
}) {
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[
        styles.memoriesScroll,
        { paddingBottom: insetBottom + 24 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Photos</Text>
      <ImageStrip images={images} onChange={onImagesChange} />
    </ScrollView>
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
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    letterSpacing: -0.2,
  },
  subText: {
    fontFamily: "Inter_400Regular",
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
    fontFamily: "Inter_600SemiBold",
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
  memoriesScroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  sectionLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
});
