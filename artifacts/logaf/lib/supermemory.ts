const TIMEOUT_MS = 10_000;
const SEARCH_TIMEOUT_MS = 20_000;
const BASE = "https://api.supermemory.ai";
const SUGGESTIONS_TTL_MS = 5 * 60 * 1000; // 5 minutes

type SuggestionsCache = {
  key: string;
  containerTag: string | null;
  suggestions: string[];
  fetchedAt: number;
};

// Module-level cache — survives tab navigation, cleared after TTL
let suggestionsCache: SuggestionsCache | null = null;

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

function abortMessage(timeoutMs: number): string {
  return `timeout after ${timeoutMs / 1000}s`;
}

function catchMessage(e: unknown, timeoutMs?: number): string {
  if (e instanceof Error) {
    if (e.name === "AbortError" && timeoutMs != null) return abortMessage(timeoutMs);
    return e.message;
  }
  return "network error";
}

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
  } catch (e: unknown) {
    clearTimeout(timer);
    return { valid: false, error: catchMessage(e, TIMEOUT_MS) };
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
    if (__DEV__) console.log("[supermemory] syncing date:", date);
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
      if (__DEV__) console.log("[supermemory] error:", res.status, body);
      return { success: false, error: `${res.status}: ${body}` };
    }

    if (__DEV__) console.log("[supermemory] synced successfully:", date);
    return { success: true };
  } catch (e: unknown) {
    clearTimeout(timer);
    const msg = catchMessage(e, TIMEOUT_MS);
    if (__DEV__) console.log("[supermemory] failed:", msg);
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
  };

  if (containerTag?.trim()) {
    body["containerTag"] = containerTag.trim();
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

  try {
    if (__DEV__) {
      console.log("[supermemory.search] request", {
        query,
        containerTag: containerTag?.trim() ?? null,
      });
    }
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
      if (__DEV__) console.log("[supermemory.search] error", res.status, errText);
      return { success: false, error: `${res.status}: ${errText}` };
    }

    const raw = (await res.json()) as Record<string, unknown>;
    // v4 API may return `content`/`score` instead of `memory`/`similarity` — normalize both
    const results: SearchResult[] = ((raw.results as Record<string, unknown>[] | undefined) ?? []).map((r) => ({
      id: String(r["id"] ?? ""),
      memory: String(r["memory"] ?? r["content"] ?? ""),
      similarity: Number(r["similarity"] ?? r["score"] ?? 0),
      updatedAt: String(r["updatedAt"] ?? ""),
      metadata: (r["metadata"] as SearchResult["metadata"]) ?? undefined,
    }));
    const data: SearchResponse = { results };
    if (__DEV__) {
      console.log("[supermemory.search] success", { count: results.length });
    }
    return { success: true, data };
  } catch (e: unknown) {
    clearTimeout(timer);
    const msg = catchMessage(e, SEARCH_TIMEOUT_MS);
    if (__DEV__) console.log("[supermemory.search] failed", msg);
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
  } catch (e: unknown) {
    clearTimeout(timer);
    return { success: false, error: catchMessage(e, SEARCH_TIMEOUT_MS) };
  }
}

export async function fetchSearchSuggestions(
  key: string,
  containerTag?: string | null,
): Promise<{ success: boolean; suggestions?: string[]; error?: string }> {
  if (!key?.trim()) return { success: false, error: "no key" };

  const normalizedKey = key.trim();
  const normalizedTag = containerTag?.trim() ?? null;

  // Return cached suggestions if still fresh
  if (
    suggestionsCache &&
    suggestionsCache.key === normalizedKey &&
    suggestionsCache.containerTag === normalizedTag &&
    Date.now() - suggestionsCache.fetchedAt < SUGGESTIONS_TTL_MS
  ) {
    if (__DEV__) console.log("[supermemory.suggestions] cache hit");
    return { success: true, suggestions: suggestionsCache.suggestions };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

  const body: Record<string, unknown> = {};
  if (normalizedTag) body["containerTag"] = normalizedTag;

  try {
    const res = await fetch(`${BASE}/v4/profile`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${normalizedKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    clearTimeout(timer);

    if (!res.ok) return { success: false, error: `${res.status}` };

    const data = await res.json();
    const raw: string[] = (data as { profile?: { dynamic?: string[] } })?.profile?.dynamic ?? [];
    const suggestions = raw
      .slice(0, 6)
      .map((s) => s.split(" ").slice(0, 5).join(" ").trim())
      .filter(Boolean);

    suggestionsCache = { key: normalizedKey, containerTag: normalizedTag, suggestions, fetchedAt: Date.now() };
    if (__DEV__) console.log("[supermemory.suggestions] fetched and cached", suggestions.length);

    return { success: true, suggestions };
  } catch (e: unknown) {
    clearTimeout(timer);
    return { success: false, error: catchMessage(e) };
  }
}
