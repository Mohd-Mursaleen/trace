export async function syncToSupermemory(
  key: string,
  date: string,
  text: string,
): Promise<{ success: boolean; error?: string }> {
  if (!key || !text.trim()) return { success: false, error: "No key or empty text" };

  try {
    const res = await fetch("https://api.supermemory.ai/v3/memories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        content: `${date}\n\n${text}`,
        metadata: {
          source: "log.af",
          date,
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { success: false, error: body };
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message ?? "Network error" };
  }
}
