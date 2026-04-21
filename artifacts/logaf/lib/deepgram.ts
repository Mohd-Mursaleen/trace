const DEEPGRAM_URL =
  "https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&punctuate=true";

export const DEEPGRAM_KEY: string =
  process.env.EXPO_PUBLIC_DEEPGRAM_API_KEY ?? "";

export async function transcribeAudio(
  fileUri: string,
  mimeType: string = "audio/m4a",
): Promise<string> {
  if (!DEEPGRAM_KEY) {
    throw new Error("Deepgram API key not configured.");
  }
  const res = await fetch(fileUri);
  const blob = await res.blob();
  const dgRes = await fetch(DEEPGRAM_URL, {
    method: "POST",
    headers: {
      Authorization: `Token ${DEEPGRAM_KEY}`,
      "Content-Type": mimeType,
    },
    body: blob,
  });
  if (!dgRes.ok) {
    const errText = await dgRes.text();
    throw new Error(`Deepgram error ${dgRes.status}: ${errText}`);
  }
  const json = (await dgRes.json()) as {
    results?: { channels?: { alternatives?: { transcript?: string }[] }[] };
  };
  const transcript =
    json.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";
  return transcript.trim();
}
