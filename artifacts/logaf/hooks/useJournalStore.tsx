import * as FileSystem from "expo-file-system";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  DEFAULT_PROFILE,
  IndexEntry,
  JournalEntry,
  Profile,
  deleteEntry as storageDeleteEntry,
  loadIndex,
  loadEntry as storageLoadEntry,
  loadProfile,
  saveEntry as storageSaveEntry,
  saveProfile,
} from "@/lib/storage";

type Ctx = {
  ready: boolean;
  profile: Profile;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
  index: IndexEntry[];
  refresh: () => Promise<void>;
  loadEntry: (date: string) => Promise<JournalEntry | null>;
  saveEntry: (entry: JournalEntry) => Promise<void>;
  deleteEntry: (date: string) => Promise<void>;
  copyImageToLocal: (uri: string) => Promise<string>;
};

const JournalContext = createContext<Ctx | null>(null);

async function ensureImagesDir(): Promise<string> {
  const dir = `${FileSystem.documentDirectory ?? ""}journal_images/`;
  try {
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
  } catch {
    // ignore
  }
  return dir;
}

export function JournalProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [index, setIndex] = useState<IndexEntry[]>([]);

  useEffect(() => {
    (async () => {
      const [p, i] = await Promise.all([loadProfile(), loadIndex()]);
      setProfile(p);
      setIndex(i);
      setReady(true);
    })();
  }, []);

  const updateProfile = useCallback(async (patch: Partial<Profile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...patch };
      void saveProfile(next);
      return next;
    });
  }, []);

  const refresh = useCallback(async () => {
    const i = await loadIndex();
    setIndex(i);
  }, []);

  const saveEntry = useCallback(async (entry: JournalEntry) => {
    const i = await storageSaveEntry(entry);
    setIndex(i);
  }, []);

  const deleteEntry = useCallback(async (date: string) => {
    const i = await storageDeleteEntry(date);
    setIndex(i);
  }, []);

  const copyImageToLocal = useCallback(async (uri: string) => {
    if (uri.startsWith("file://") && uri.includes("journal_images/")) {
      return uri;
    }
    const dir = await ensureImagesDir();
    const ext = uri.split(".").pop()?.split("?")[0] || "jpg";
    const filename = `${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;
    const dest = dir + filename;
    try {
      await FileSystem.copyAsync({ from: uri, to: dest });
      return dest;
    } catch {
      return uri;
    }
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      ready,
      profile,
      updateProfile,
      index,
      refresh,
      loadEntry: storageLoadEntry,
      saveEntry,
      deleteEntry,
      copyImageToLocal,
    }),
    [
      ready,
      profile,
      updateProfile,
      index,
      refresh,
      saveEntry,
      deleteEntry,
      copyImageToLocal,
    ],
  );

  return (
    <JournalContext.Provider value={value}>{children}</JournalContext.Provider>
  );
}

export function useJournalStore(): Ctx {
  const ctx = useContext(JournalContext);
  if (!ctx) throw new Error("useJournalStore must be used within JournalProvider");
  return ctx;
}
