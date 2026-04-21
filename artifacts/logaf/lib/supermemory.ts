const TIMEOUT_MS = 10_000;

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
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch("https://api.supermemory.ai/v4/memories?limit=1&containerTag=logaf", {
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
            metadata: { source: "log.af", date },
          },
        ],
        containerTag: "logaf",
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
      e?.name === "AbortError" ? "timeout after 10s" : (e?.message ?? "network error");
    console.log("[supermemory] failed:", msg);
    return { success: false, error: msg };
  }
}
