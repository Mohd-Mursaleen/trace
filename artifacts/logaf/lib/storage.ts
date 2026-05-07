import AsyncStorage from "@react-native-async-storage/async-storage";

export type Profile = {
  name: string;
  photoUri: string;
  supermemoryEnabled: boolean;
  supermemoryKey: string;
  supermemoryContainerTag: string;
  hasCompletedOnboarding: boolean;
  reminderEnabled: boolean;
  /** 0–23 */
  reminderHour: number;
  /** 0–59 */
  reminderMinute: number;
  /** Whether the user has opted into on-device AI (Gemma 4 E2B via LiteRT-LM) */
  aiEnabled: boolean;
};

export type JournalEntry = {
  date: string;
  text: string;
  images: string[];
  previewImage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type IndexEntry = {
  date: string;
  previewImage: string | null;
  hasText: boolean;
};

const PROFILE_KEY = "user_profile";
const INDEX_KEY = "journal_index";
const ENTRY_PREFIX = "journal_entry_";

export const DEFAULT_PROFILE: Profile = {
  name: "",
  photoUri: "",
  supermemoryEnabled: false,
  supermemoryKey: "",
  supermemoryContainerTag: "",
  hasCompletedOnboarding: false,
  reminderEnabled: true,
  reminderHour: 21,
  reminderMinute: 0,
  aiEnabled: false,
};

export async function loadProfile(): Promise<Profile> {
  const raw = await AsyncStorage.getItem(PROFILE_KEY);
  if (!raw) return DEFAULT_PROFILE;
  try {
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export async function saveProfile(profile: Profile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export async function loadIndex(): Promise<IndexEntry[]> {
  const raw = await AsyncStorage.getItem(INDEX_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as IndexEntry[];
  } catch {
    return [];
  }
}

export async function saveIndex(index: IndexEntry[]): Promise<void> {
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

export async function loadEntry(date: string): Promise<JournalEntry | null> {
  const raw = await AsyncStorage.getItem(ENTRY_PREFIX + date);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as JournalEntry;
  } catch {
    return null;
  }
}

export async function saveEntry(entry: JournalEntry): Promise<IndexEntry[]> {
  const now = new Date().toISOString();
  const final: JournalEntry = {
    ...entry,
    previewImage: entry.images[0] ?? null,
    updatedAt: now,
    createdAt: entry.createdAt || now,
  };
  await AsyncStorage.setItem(ENTRY_PREFIX + entry.date, JSON.stringify(final));
  const index = await loadIndex();
  const filtered = index.filter((e) => e.date !== entry.date);
  const hasContent = final.text.trim().length > 0 || final.images.length > 0;
  if (hasContent) {
    filtered.push({
      date: final.date,
      previewImage: final.previewImage,
      hasText: final.text.trim().length > 0,
    });
  }
  filtered.sort((a, b) => b.date.localeCompare(a.date));
  await saveIndex(filtered);
  return filtered;
}

export async function deleteEntry(date: string): Promise<IndexEntry[]> {
  await AsyncStorage.removeItem(ENTRY_PREFIX + date);
  const index = (await loadIndex()).filter((e) => e.date !== date);
  await saveIndex(index);
  return index;
}
