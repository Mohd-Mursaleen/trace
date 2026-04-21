export async function syncToSupermemory(
  key: string,
  date: string,
  text: string,
): Promise<{ success: boolean; error?: string }> {
  if (!key?.trim() || !text?.trim()) return { success: false, error: "missing key or text" };

  try {
    console.log("Syncing to Supermemory, key present:", !!key, "date:", date);
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
      return { success: false, error: `${res.status}: ${body}` };
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message ?? "Network error" };
  }
}
