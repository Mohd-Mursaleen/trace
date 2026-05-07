/**
 * On-device AI wrapper around react-native-litert-lm (Gemma 4 E2B IT).
 * Handles model download, engine lifecycle, and cached text/vision generation.
 *
 * IMPORTANT: react-native-litert-lm uses NitroModules (JSI) — requires a native
 * dev-client build. In Expo Go this module is unavailable; getLM() returns null
 * and all functions that need the native module throw (caught by callers).
 * The app degrades gracefully: AI status stays "disabled".
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

// ---- Lazy require (avoids Expo Go crash) ----

type LMModule = typeof import("react-native-litert-lm");
let _lm: LMModule | null = null;

function getLM(): LMModule | null {
  if (_lm) return _lm;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _lm = require("react-native-litert-lm") as LMModule;
    return _lm;
  } catch {
    return null;
  }
}

/** True when LiteRT-LM native module loaded (dev-client / standalone). False in Expo Go. */
export function isLMAvailable(): boolean {
  return getLM() !== null;
}

// ---- Model file tracking ----
// engine.downloadModel(url, filename) stores the file in the native app files
// directory and returns the absolute path. We persist that path so we can:
//   1. Check if already downloaded (isModelDownloaded)
//   2. Pass the local path directly to loadModel on subsequent launches

const MODEL_FILENAME = "gemma-4-E2B-it.litertlm"; // matches URL basename
const MODEL_PATH_KEY = "ai_model_local_path";

/** Returns true if the model has been downloaded and its file still exists on disk. */
export async function isModelDownloaded(): Promise<boolean> {
  const storedPath = await AsyncStorage.getItem(MODEL_PATH_KEY);
  if (!storedPath) return false;
  try {
    const info = await FileSystem.getInfoAsync(storedPath);
    return info.exists;
  } catch {
    return false;
  }
}

// ---- Engine singleton ----
// The same instance is used for both download and inference.

import type { LiteRTLMInstance } from "react-native-litert-lm";
let engine: LiteRTLMInstance | null = null;

/**
 * Returns the engine singleton, creating it if needed.
 * createLLM() is synchronous — it instantiates the NitroModule hybrid object.
 */
function getOrCreateEngine(): LiteRTLMInstance {
  const lm = getLM();
  if (!lm) throw new Error("LiteRT-LM not available in this environment");
  if (!engine) {
    engine = lm.createLLM();
  }
  return engine;
}

// ---- Download ----

/**
 * Downloads the Gemma 4 E2B model via the native engine's download API.
 * The engine saves the file to the app's native files directory and returns
 * the absolute path, which we persist for future launches.
 *
 * @param onProgress - Called with 0–1 as bytes arrive.
 */
export async function downloadModel(onProgress: (progress: number) => void): Promise<void> {
  const lm = getLM();
  if (!lm) throw new Error("LiteRT-LM not available");

  const e = getOrCreateEngine();
  // GEMMA_4_E2B_IT is a plain string URL — the HuggingFace download link
  const localPath = await e.downloadModel(lm.GEMMA_4_E2B_IT, MODEL_FILENAME, onProgress);
  await AsyncStorage.setItem(MODEL_PATH_KEY, localPath);
}

// ---- Load / Init ----

/**
 * Loads the already-downloaded model into the inference engine.
 * No-op if the engine already has a model loaded.
 *
 * @throws If model was not downloaded first.
 */
export async function initEngine(): Promise<void> {
  if (engine?.isReady()) return;

  const localPath = await AsyncStorage.getItem(MODEL_PATH_KEY);
  if (!localPath) throw new Error("Model not downloaded — call downloadModel() first");

  const e = getOrCreateEngine();
  await e.loadModel(localPath, {
    backend: "cpu",   // safe default; GPU via OpenCL often unavailable on Samsung/Qualcomm
    temperature: 0.7,
    maxTokens: 200,   // keeps summaries/prompts concise
  });
}

// ---- Dispose ----

/** Unloads the engine and releases native memory. */
export function disposeEngine(): void {
  try {
    engine?.close();
  } catch {
    /* ignore — engine may already be closed */
  }
  engine = null;
}

/** Returns true if engine is loaded and ready for inference. */
export function isEngineReady(): boolean {
  return engine?.isReady() ?? false;
}

// ---- Delete model ----

/**
 * Deletes the downloaded model file via the native API, disposes the engine,
 * and clears the stored path. Safe to call even if model is not present.
 */
export async function deleteModelFile(): Promise<void> {
  try {
    if (engine) await engine.deleteModel(MODEL_FILENAME);
  } catch {
    /* ignore — file may already be gone */
  }
  disposeEngine();
  await AsyncStorage.removeItem(MODEL_PATH_KEY);
}

// ---- Internal generation helpers ----

/**
 * Sends a text prompt and returns the full response.
 * Uses sendMessage() which is async but returns Promise<string> — correct for
 * non-streaming use cases (summaries, prompts, descriptions).
 * Resets conversation context before each call to avoid cross-contamination.
 */
async function generate(prompt: string): Promise<string> {
  if (!engine?.isReady()) throw new Error("Engine not ready");
  engine.resetConversation(); // fresh context each call
  const result = await engine.sendMessage(prompt);
  return result.trim();
}

/**
 * Sends an image + text prompt and returns the model's description.
 * Uses Gemma 4's multimodal vision capability.
 */
async function generateVision(imagePath: string, prompt: string): Promise<string> {
  if (!engine?.isReady()) throw new Error("Engine not ready");
  engine.resetConversation();
  const result = await engine.sendMessageWithImage(prompt, imagePath);
  return result.trim();
}

// ---- Cache key helpers ----

/** ISO week string for the current date: "YYYY-WNN" */
function currentISOWeekKey(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const week =
    1 +
    Math.round(
      ((d.getTime() - jan4.getTime()) / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7,
    );
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Short deterministic hash of a URI for keying photo description cache entries. */
function uriHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

// ---- Public cached generators ----

/**
 * Returns a one-sentence weekly summary of the provided journal texts.
 * Cached per ISO week — generated once, returned from cache on subsequent calls.
 *
 * @param recentTexts - Entry texts, most-recent-first, up to 7.
 */
export async function getWeeklySummary(recentTexts: string[]): Promise<string | null> {
  const key = `ai_weekly_summary_${currentISOWeekKey()}`;
  const cached = await AsyncStorage.getItem(key);
  if (cached) return cached;
  if (!engine?.isReady() || recentTexts.length === 0) return null;

  const context = recentTexts
    .slice(0, 7)
    .map((t, i) => `Entry ${i + 1}: ${t.slice(0, 250)}`)
    .join("\n");

  const prompt =
    "Based on these recent journal entries, write exactly one sentence (max 25 words) " +
    "capturing the week's overall theme or mood. " +
    "Output only the sentence — no labels, no quotes, no preamble.\n\n" +
    context;

  try {
    const result = await generate(prompt);
    if (result) {
      await AsyncStorage.setItem(key, result);
      return result;
    }
  } catch {
    /* non-fatal — fall back silently */
  }
  return null;
}

/**
 * Returns a contextual writing prompt for the given date.
 * Cached per calendar day.
 *
 * @param date - ISO date string "YYYY-MM-DD".
 * @param recentTexts - Recent entry texts for context (up to 3).
 */
export async function getWritingPrompt(
  date: string,
  recentTexts: string[],
): Promise<string | null> {
  const key = `ai_writing_prompt_${date}`;
  const cached = await AsyncStorage.getItem(key);
  if (cached) return cached;
  if (!engine?.isReady()) return null;

  const context =
    recentTexts.length > 0
      ? `\nRecent context: ${recentTexts
          .slice(0, 3)
          .map((t) => t.slice(0, 100))
          .join(" | ")}`
      : "";

  const prompt =
    "You are a journal writing coach. Write one short, specific writing prompt for today " +
    "(max 15 words). Start with 'Try writing about' or 'Reflect on'. " +
    "Output only the prompt text, nothing else." +
    context;

  try {
    const result = await generate(prompt);
    if (result) {
      await AsyncStorage.setItem(key, result);
      return result;
    }
  } catch {
    /* non-fatal */
  }
  return null;
}

/**
 * Returns a one-sentence vision description of a photo.
 * Cached permanently by URI hash.
 *
 * @param imagePath - Local file URI of the image.
 */
export async function getPhotoDescription(imagePath: string): Promise<string | null> {
  const key = `ai_photo_${uriHash(imagePath)}`;
  const cached = await AsyncStorage.getItem(key);
  if (cached) return cached;
  if (!engine?.isReady()) return null;

  try {
    const desc = await generateVision(
      imagePath,
      "Describe this photo in one sentence (max 15 words). " +
        "Focus on what's happening, mood, or setting. Output only the sentence.",
    );
    if (desc) {
      await AsyncStorage.setItem(key, desc);
      return desc;
    }
  } catch {
    /* non-fatal */
  }
  return null;
}

/**
 * Reads a cached photo description without triggering generation.
 * Safe to call when engine is not loaded.
 */
export async function getCachedPhotoDescription(imagePath: string): Promise<string | null> {
  return AsyncStorage.getItem(`ai_photo_${uriHash(imagePath)}`);
}
