/**
 * Export and import journal data as a portable .logaf JSON file.
 * Images are embedded as base64 strings so the file is fully self-contained.
 */
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { loadEntry, loadIndex, saveEntry } from "@/lib/storage";

// --- Types ---

type ExportEntry = {
  date: string;
  text: string;
  /** base64-encoded image bytes */
  images: string[];
  /** file extension per image ("jpg", "png", …) */
  imageExts: string[];
  createdAt: string;
  updatedAt: string;
};

export type ExportFile = {
  version: 1;
  exportedAt: string;
  entries: ExportEntry[];
};

// --- Export ---

/**
 * Collects all local journal entries, encodes their images as base64,
 * writes a .logaf JSON file to the temp directory, then opens the system
 * share sheet so the user can save/send it however they like.
 *
 * @returns success flag + entry count or an error string
 */
export async function exportData(): Promise<{
  success: boolean;
  count?: number;
  error?: string;
}> {
  try {
    const index = await loadIndex();
    const entries: ExportEntry[] = [];

    for (const idx of index) {
      const entry = await loadEntry(idx.date);
      if (!entry) continue;

      const b64Images: string[] = [];
      const exts: string[] = [];

      for (const uri of entry.images) {
        try {
          const b64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          b64Images.push(b64);
          const ext = uri.split(".").pop()?.split("?")[0]?.toLowerCase() ?? "jpg";
          exts.push(ext);
        } catch {
          // Skip images that can no longer be read (deleted/moved)
        }
      }

      entries.push({
        date: entry.date,
        text: entry.text,
        images: b64Images,
        imageExts: exts,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      });
    }

    const exportFile: ExportFile = {
      version: 1,
      exportedAt: new Date().toISOString(),
      entries,
    };

    const filename = `logaf_export_${new Date().toISOString().slice(0, 10)}.logaf`;
    const dest = `${FileSystem.cacheDirectory ?? ""}${filename}`;
    await FileSystem.writeAsStringAsync(dest, JSON.stringify(exportFile), {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      return { success: false, error: "Sharing is not available on this device." };
    }

    await Sharing.shareAsync(dest, {
      mimeType: "application/json",
      dialogTitle: "Save your log.af backup",
    });

    return { success: true, count: entries.length };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Export failed" };
  }
}

// --- Import ---

/**
 * Describes how to handle an entry whose date already exists locally.
 * "replace" overwrites the local entry; "keep" skips it.
 */
export type ConflictResolution = "replace" | "keep" | "cancel";

/**
 * Picks a .logaf file, parses it, resolves any date conflicts via the
 * provided callback, then writes all applicable entries to local storage.
 *
 * @param onConflict - Called when ≥1 conflict exists. Resolves with user's choice.
 * @returns summary of what was imported / skipped, or an error
 */
export async function importData(
  onConflict: (conflictCount: number) => Promise<ConflictResolution>,
): Promise<{
  success: boolean;
  imported?: number;
  skipped?: number;
  error?: string;
}> {
  try {
    // 1. Pick file
    const picked = await DocumentPicker.getDocumentAsync({
      type: ["application/json", "*/*"],
      copyToCacheDirectory: true,
    });
    if (picked.canceled) return { success: false, error: "cancelled" };

    const fileUri = picked.assets[0]?.uri;
    if (!fileUri) return { success: false, error: "No file selected" };

    // 2. Parse
    const raw = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    let data: ExportFile;
    try {
      data = JSON.parse(raw) as ExportFile;
    } catch {
      return { success: false, error: "File is not a valid log.af backup." };
    }
    if (data.version !== 1 || !Array.isArray(data.entries)) {
      return { success: false, error: "Unrecognised backup format." };
    }

    // 3. Identify conflicts
    const index = await loadIndex();
    const existingDates = new Set(index.map((e) => e.date));
    const conflicts = data.entries.filter((e) => existingDates.has(e.date));

    let resolution: ConflictResolution = "replace";
    if (conflicts.length > 0) {
      resolution = await onConflict(conflicts.length);
      if (resolution === "cancel") return { success: false, error: "cancelled" };
    }

    // 4. Write entries
    let imported = 0;
    let skipped = 0;

    // Ensure the images directory exists
    const imgDir = `${FileSystem.documentDirectory ?? ""}journal_images/`;
    try {
      const info = await FileSystem.getInfoAsync(imgDir);
      if (!info.exists) {
        await FileSystem.makeDirectoryAsync(imgDir, { intermediates: true });
      }
    } catch { /* ignore */ }

    for (const e of data.entries) {
      const isConflict = existingDates.has(e.date);
      if (isConflict && resolution === "keep") {
        skipped++;
        continue;
      }

      // Restore images from base64
      const localUris: string[] = [];
      for (let i = 0; i < e.images.length; i++) {
        const ext = e.imageExts[i] ?? "jpg";
        const fname = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const dest = imgDir + fname;
        try {
          await FileSystem.writeAsStringAsync(dest, e.images[i]!, {
            encoding: FileSystem.EncodingType.Base64,
          });
          localUris.push(dest);
        } catch {
          // Skip images that can't be written
        }
      }

      await saveEntry({
        date: e.date,
        text: e.text,
        images: localUris,
        previewImage: localUris[0] ?? null,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      });
      imported++;
    }

    return { success: true, imported, skipped };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : "Import failed" };
  }
}
