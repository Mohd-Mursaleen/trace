const TIMEOUT_MS = 10_000;

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
