import { useEffect, useRef, useState } from "react";

import type { JournalEntry } from "@/lib/storage";

const AUTOSAVE_INTERVAL_MS = 5_000;

type Params = {
  /** Whether autosave should run (i.e. sheet is visible and entry is loaded). */
  active: boolean;
  date: string | null;
  text: string;
  images: string[];
  originalEntry: JournalEntry | null;
  /** Ref that callers flip to true when content changes. Reset to false after each save. */
  dirtyRef: React.MutableRefObject<boolean>;
  saveEntry: (entry: JournalEntry) => Promise<void>;
};

/**
 * Saves the current entry every AUTOSAVE_INTERVAL_MS when dirty.
 * Uses a stable-callback-ref pattern so the interval never re-registers
 * on state changes — no stale closure sync effects needed in the parent.
 */
export function useAutosave({
  active,
  date,
  text,
  images,
  originalEntry,
  dirtyRef,
  saveEntry,
}: Params): { autoSaved: boolean } {
  const [autoSaved, setAutoSaved] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refreshed every render — interval always reads latest state values.
  const callbackRef = useRef<() => Promise<void>>(async () => {});
  callbackRef.current = async () => {
    if (!dirtyRef.current || !date) return;
    if (text.trim().length === 0 && images.length === 0) return;
    try {
      await saveEntry({
        date,
        text,
        images,
        previewImage: images[0] ?? null,
        createdAt: originalEntry?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      dirtyRef.current = false;
      setAutoSaved(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setAutoSaved(false), 2000);
    } catch {
      // Silent — non-critical, manual Save button still works.
    }
  };

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      void callbackRef.current();
    }, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [active]); // interval never changes; content is read fresh via callbackRef

  // Cleanup timer on unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { autoSaved };
}
