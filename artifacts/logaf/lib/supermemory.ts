const TIMEOUT_MS = 10_000;
const SEARCH_TIMEOUT_MS = 20_000;
const CONTAINER_TAG = "trace_user";

export type SearchResult = {
  id: string;
  memory?: string;
  chunk?: string;
  similarity: number;
  metadata?: {
    date?: string;
    source?: string;
    year?: string;
    month?: string;
    [key: string]: unknown;
  };
  updatedAt?: string;
};

export type SearchResponse = {
  results: SearchResult[];
  timing: number;
  total: number;
};

export type ProfileResponse = {
  profile: {
    static: string[];
    dynamic: string[];
  };
  searchResults?: SearchResponse;
};

/**
 * Validates a Supermemory API key by attempting to list memories (GET).
 * A 200 or 404 means the key is accepted; 401/403 means invalid.
 *
 * @returns { valid: boolean; error?: string }
 */
export async function validateSupermemoryKey(
  key: string,
): Promise<{ valid: boolean; error?: string }> {
  if (!key?.trim()) return { valid: false, error: "No key provided" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

  try {
    const res = await fetch(
      `https://api.supermemory.ai/v4/memories?limit=1&containerTag=${CONTAINER_TAG}`,
      {
        method: "GET",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${key.trim()}`,
          "Content-Type": "application/json",
        },
      },
    );
    clearTimeout(timer);

    if (res.status === 401 || res.status === 403) {
      return { valid: false, error: "Invalid API key" };
    }
    // 200 (memories found) or 404 (no memories yet) both mean the key works
    return { valid: true };
  } catch (e: any) {
    clearTimeout(timer);
    const msg =
      e?.name === "AbortError" ? "Request timed out" : (e?.message ?? "Network error");
    return { valid: false, error: msg };
  }
}

/**
 * Syncs a journal entry to Supermemory using the v4 API.
 * Uses AbortController to enforce a 10s timeout.
 */
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
    const res = await fetch("https://api.supermemory.ai/v4/memories", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key.trim()}`,
      },
      body: JSON.stringify({
        memories: [
          {
            content: `${date}\n\n${text}`,
            metadata: {
              source: "trace",
              date,
              year: date.split("-")[0],
              month: date.slice(0, 7),
            },
          },
        ],
        containerTag: CONTAINER_TAG,
      }),
    });
    clearTimeout(timer);

    if (!res.ok) {
      const body = await res.text();
      console.log("[supermemory] error:", res.status, body);
      return { success: false, error: `${res.status}: ${body}` };
    }

    console.log("[supermemory] success");
    return { success: true };
  } catch (e: any) {
    clearTimeout(timer);
    const msg =
      e?.name === "AbortError"
        ? `timeout after ${SEARCH_TIMEOUT_MS / 1000}s`
        : (e?.message ?? "network error");
    console.log("[supermemory] failed:", msg);
    return { success: false, error: msg };
  }
}

export async function searchMemories(
  key: string,
  query: string,
  dateFrom?: string | null,
): Promise<{ success: boolean; data?: SearchResponse; error?: string }> {
  if (!key?.trim() || !query?.trim()) {
    return { success: false, error: "missing key or query" };
  }

  const body: Record<string, unknown> = {
    q: query,
    containerTag: CONTAINER_TAG,
    searchMode: "hybrid",
    limit: 8,
    threshold: 0.5,
    rerank: true,
  };

  if (dateFrom) {
    body["filters"] = {
      AND: [{ key: "date", value: dateFrom, operator: "gte" }],
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    console.log("[supermemory.search] request", { query, dateFrom: dateFrom ?? null });
    const res = await fetch("https://api.supermemory.ai/v3/memories/search", {
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
      total: data?.total ?? 0,
      count: data?.results?.length ?? 0,
    });
    return { success: true, data };
  } catch (e: any) {
    clearTimeout(timer);
    const msg =
      e?.name === "AbortError" ? "timeout after 10s" : (e?.message ?? "network error");
    console.log("[supermemory.search] failed", msg);
    return { success: false, error: msg };
  }
}

export async function fetchProfile(
  key: string,
): Promise<{ success: boolean; data?: ProfileResponse; error?: string }> {
  if (!key?.trim()) return { success: false, error: "no key" };

  try {
    const res = await fetch(
      `https://api.supermemory.ai/v3/profile?containerTag=${CONTAINER_TAG}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${key.trim()}`,
        },
      },
    );

    if (!res.ok) {
      const t = await res.text();
      return { success: false, error: `${res.status}: ${t}` };
    }

    const data = (await res.json()) as ProfileResponse;
    return { success: true, data };
  } catch (e: any) {
    return { success: false, error: e?.message ?? "network error" };
  }
}
