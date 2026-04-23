const TIMEOUT_MS = 10_000;
const SEARCH_TIMEOUT_MS = 20_000;
const BASE = "https://api.supermemory.ai";

export type SearchResult = {
  id: string;
  memory: string;
  similarity: number;
  updatedAt: string;
  metadata?: {
    date?: string;
    source?: string;
    year?: string | number;
    month?: string | number;
    [key: string]: unknown;
  };
};

export type SearchResponse = {
  results: SearchResult[];
};

export type ProfileResponse = {
  profile: {
    static: string[];
    dynamic: string[];
  };
  searchResults?: {
    results: SearchResult[];
  };
};

export async function validateSupermemoryKey(
  key: string,
): Promise<{ valid: boolean; error?: string }> {
  if (!key?.trim()) return { valid: false, error: "No key provided" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE}/v3/documents?limit=1`, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key.trim()}`,
        "Content-Type": "application/json",
      },
    });
    clearTimeout(timer);

    if (res.status === 401 || res.status === 403) {
      return { valid: false, error: "Invalid API key" };
    }
    return { valid: true };
  } catch (e: any) {
    clearTimeout(timer);
    const msg =
      e?.name === "AbortError"
        ? "Request timed out"
        : (e?.message ?? "Network error");
    return { valid: false, error: msg };
  }
}

export async function syncToSupermemory(
  key: string,
  date: string,
  text: string,
): Promise<{ success: boolean; error?: string }> {
  if (!key?.trim() || !text?.trim()) {
    return { success: false, error: "missing key or text" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    console.log("[supermemory] syncing date:", date);
    const res = await fetch(`${BASE}/v3/documents`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key.trim()}`,
      },
      body: JSON.stringify({
        content: `${date}\n\n${text}`,
        customId: `trace-journal-${date}`,
        taskType: "memory",
        entityContext:
          "This is a private daily journal entry written by the user. " +
          "Extract all meaningful facts about: emotional state and mood, " +
          "people mentioned and relationships, places visited, " +
          "work projects and progress, decisions made, " +
          "things the person is grateful for, struggles and challenges, " +
          "goals and aspirations, health and energy levels, " +
          "and any recurring life patterns or themes. " +
          `Entry date: ${date}.`,
        metadata: {
          source: "trace",
          date,
          year: date.split("-")[0],
          month: date.slice(0, 7),
        },
      }),
    });
    clearTimeout(timer);

    if (!res.ok) {
      const body = await res.text();
      console.log("[supermemory] error:", res.status, body);
      return { success: false, error: `${res.status}: ${body}` };
    }

    console.log("[supermemory] synced successfully:", date);
    return { success: true };
  } catch (e: any) {
    clearTimeout(timer);
    const msg =
      e?.name === "AbortError"
        ? `timeout after ${TIMEOUT_MS / 1000}s`
        : (e?.message ?? "network error");
    console.log("[supermemory] failed:", msg);
    return { success: false, error: msg };
  }
}

export async function searchMemories(
  key: string,
  query: string,
  containerTag?: string | null,
): Promise<{ success: boolean; data?: SearchResponse; error?: string }> {
  if (!key?.trim() || !query?.trim()) {
    return { success: false, error: "missing key or query" };
  }

  const body: Record<string, unknown> = {
    q: query,
    searchMode: "hybrid",
    limit: 8,
    threshold: 0.3,
    rerank: true,
    rewriteQuery: true,
    aggregate: true,
  };

  if (containerTag?.trim()) {
    body["containerTag"] = containerTag.trim();
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

  try {
    console.log("[supermemory.search] request", {
      query,
      containerTag: containerTag?.trim() ?? null,
    });
    const res = await fetch(`${BASE}/v4/search`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key.trim()}`,
      },
      body: JSON.stringify(body),
    });
    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text();
      console.log("[supermemory.search] error", res.status, errText);
      return { success: false, error: `${res.status}: ${errText}` };
    }

    const data = (await res.json()) as SearchResponse;
    console.log("[supermemory.search] success", {
      count: data?.results?.length ?? 0,
    });
    return { success: true, data };
  } catch (e: any) {
    clearTimeout(timer);
    const msg =
      e?.name === "AbortError"
        ? `timeout after ${SEARCH_TIMEOUT_MS / 1000}s`
        : (e?.message ?? "network error");
    console.log("[supermemory.search] failed", msg);
    return { success: false, error: msg };
  }
}

export async function fetchProfile(
  key: string,
): Promise<{ success: boolean; data?: ProfileResponse; error?: string }> {
  if (!key?.trim()) return { success: false, error: "no key" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE}/v3/profile`, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key.trim()}`,
      },
    });
    clearTimeout(timer);

    if (!res.ok) {
      const t = await res.text();
      return { success: false, error: `${res.status}: ${t}` };
    }

    const data = (await res.json()) as ProfileResponse;
    return { success: true, data };
  } catch (e: any) {
    clearTimeout(timer);
    const msg =
      e?.name === "AbortError"
        ? `timeout after ${SEARCH_TIMEOUT_MS / 1000}s`
        : (e?.message ?? "network error");
    return { success: false, error: msg };
  }
}

export async function fetchSearchSuggestions(
  key: string,
  containerTag?: string | null,
): Promise<{ success: boolean; suggestions?: string[]; error?: string }> {
  if (!key?.trim()) return { success: false, error: "no key" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

  const body: Record<string, unknown> = {};
  if (containerTag?.trim()) body["containerTag"] = containerTag.trim();

  try {
    const res = await fetch(`${BASE}/v4/profile`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    clearTimeout(timer);

    if (!res.ok) return { success: false, error: `${res.status}` };

    const data = await res.json();
    const raw: string[] = data?.profile?.dynamic ?? [];
    const suggestions = raw
      .slice(0, 6)
      .map((s) => s.split(" ").slice(0, 5).join(" ").trim())
      .filter(Boolean);

    return { success: true, suggestions };
  } catch (e: any) {
    clearTimeout(timer);
    return { success: false, error: e?.message ?? "network error" };
  }
}
