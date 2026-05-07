/**
 * On-device AI context.
 * Manages the LiteRT-LM engine lifecycle (download → load → ready) and
 * exposes cached generator functions to the rest of the app.
 * Must be rendered inside JournalProvider.
 *
 * Gracefully no-ops in Expo Go (isLMAvailable() = false).
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  deleteModelFile,
  disposeEngine,
  downloadModel,
  getCachedPhotoDescription,
  getPhotoDescription,
  getWeeklySummary,
  getWritingPrompt,
  initEngine,
  isLMAvailable,
  isModelDownloaded,
} from "@/lib/ai";
import { useJournalStore } from "@/hooks/useJournalStore";

// ---- Types ----

export type AIStatus =
  | "disabled"       // user has not opted in (or Expo Go)
  | "not_downloaded" // opted in but model file not on disk
  | "downloading"    // actively downloading (2.58 GB)
  | "loading"        // model on disk, engine initializing
  | "ready";         // engine loaded, inference available

type Ctx = {
  status: AIStatus;
  /** 0–1 download progress; 0 when not downloading */
  downloadProgress: number;
  /** Opt in to AI + start model download */
  enableAI: () => void;
  /** Resume a previously cancelled download */
  startDownload: () => void;
  /** Cancel an in-progress download (keeps aiEnabled=true, status → not_downloaded) */
  cancelDownload: () => void;
  /** Disable AI, dispose engine, delete model file */
  disableAI: () => void;
  /** Generate (or return cached) weekly summary from last 7 entries */
  generateWeeklySummary: () => Promise<string | null>;
  /** Generate (or return cached) writing prompt for a given date */
  generateWritingPrompt: (date: string) => Promise<string | null>;
  /** Generate (or return cached) vision description for a photo */
  describePhoto: (imagePath: string) => Promise<string | null>;
  /** Read cached photo description without triggering generation */
  getCachedDescription: (imagePath: string) => Promise<string | null>;
};

const AiContext = createContext<Ctx | null>(null);

// ---- Provider ----

export function AiProvider({ children }: { children: React.ReactNode }) {
  const { ready, profile, index, loadEntry, updateProfile } = useJournalStore();

  const [status, setStatus] = useState<AIStatus>("disabled");
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Used to ignore download result after user cancels
  const cancelledRef = useRef(false);

  // ---- Startup: restore state from profile + filesystem ----
  // Runs once when the JournalProvider finishes loading the profile.
  // Live enable/disable toggles are handled by enableAI / disableAI directly.
  useEffect(() => {
    if (!ready) return;

    // Expo Go: LiteRT-LM native module unavailable — keep disabled silently
    if (!isLMAvailable()) {
      setStatus("disabled");
      return;
    }

    if (!profile.aiEnabled) {
      setStatus("disabled");
      return;
    }

    // aiEnabled was true from a previous session — restore
    isModelDownloaded().then((downloaded) => {
      if (!downloaded) {
        setStatus("not_downloaded");
        return;
      }
      setStatus("loading");
      initEngine()
        .then(() => setStatus("ready"))
        .catch(() => setStatus("not_downloaded"));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]); // Intentional: only react to profile being ready, not live changes

  // ---- Shared download + load runner ----
  const runDownload = useCallback(async () => {
    cancelledRef.current = false;
    setStatus("downloading");
    setDownloadProgress(0);

    try {
      await downloadModel((p) => {
        if (!cancelledRef.current) setDownloadProgress(p);
      });
    } catch {
      if (!cancelledRef.current) {
        setStatus("not_downloaded");
        setDownloadProgress(0);
      }
      return;
    }

    // User may have tapped cancel while download was running in native
    if (cancelledRef.current) return;

    setStatus("loading");
    try {
      await initEngine();
      setStatus("ready");
    } catch {
      setStatus("not_downloaded");
    }
  }, []);

  // ---- Public actions ----

  const enableAI = useCallback(() => {
    if (!isLMAvailable()) {
      if (__DEV__) {
        console.warn("[AI] LiteRT-LM unavailable — build a dev client to use on-device AI.");
      }
      return;
    }
    void updateProfile({ aiEnabled: true });
    void runDownload();
  }, [updateProfile, runDownload]);

  const startDownload = useCallback(() => {
    if (status !== "not_downloaded") return;
    void runDownload();
  }, [status, runDownload]);

  const cancelDownload = useCallback(() => {
    // Mark as cancelled — runDownload checks this ref before proceeding to load
    cancelledRef.current = true;
    setStatus("not_downloaded");
    setDownloadProgress(0);
    // Note: native download may still complete and save the file to disk,
    // which is fine — the stored path will be valid next time.
  }, []);

  const disableAI = useCallback(async () => {
    cancelledRef.current = true; // stop any in-flight download
    await deleteModelFile();
    await updateProfile({ aiEnabled: false });
    setStatus("disabled");
    setDownloadProgress(0);
  }, [updateProfile]);

  // ---- Helpers for loading recent entry texts ----

  const getRecentTexts = useCallback(async (): Promise<string[]> => {
    const recent = index.slice(0, 7);
    const entries = await Promise.all(recent.map((e) => loadEntry(e.date)));
    return entries
      .filter((e): e is NonNullable<typeof e> => !!e && !!e.text.trim())
      .map((e) => e.text);
  }, [index, loadEntry]);

  // ---- Generators ----

  const generateWeeklySummaryFn = useCallback(async (): Promise<string | null> => {
    if (status !== "ready") return null;
    const texts = await getRecentTexts();
    return getWeeklySummary(texts);
  }, [status, getRecentTexts]);

  const generateWritingPromptFn = useCallback(
    async (date: string): Promise<string | null> => {
      if (status !== "ready") return null;
      const texts = await getRecentTexts();
      return getWritingPrompt(date, texts);
    },
    [status, getRecentTexts],
  );

  const describePhoto = useCallback(
    async (imagePath: string): Promise<string | null> => {
      if (status !== "ready") return null;
      return getPhotoDescription(imagePath);
    },
    [status],
  );

  const getCachedDescriptionFn = useCallback(
    (imagePath: string): Promise<string | null> => getCachedPhotoDescription(imagePath),
    [],
  );

  // ---- Context value ----

  const value = useMemo<Ctx>(
    () => ({
      status,
      downloadProgress,
      enableAI,
      startDownload,
      cancelDownload,
      disableAI,
      generateWeeklySummary: generateWeeklySummaryFn,
      generateWritingPrompt: generateWritingPromptFn,
      describePhoto,
      getCachedDescription: getCachedDescriptionFn,
    }),
    [
      status,
      downloadProgress,
      enableAI,
      startDownload,
      cancelDownload,
      disableAI,
      generateWeeklySummaryFn,
      generateWritingPromptFn,
      describePhoto,
      getCachedDescriptionFn,
    ],
  );

  return <AiContext.Provider value={value}>{children}</AiContext.Provider>;
}

export function useAI(): Ctx {
  const ctx = useContext(AiContext);
  if (!ctx) throw new Error("useAI must be used within AiProvider");
  return ctx;
}
