/**
 * Deepgram batch transcription.
 *
 * Model params tuned for speed + accuracy:
 *   nova-3        → fastest, most accurate Deepgram model
 *   language=multi → auto-detects and handles Hindi/English codeswitching
 *   smart_format  → numbers, dates, currencies formatted correctly
 *   punctuate     → adds punctuation for readable output
 *   filler_words=false → strips um/uh/like for cleaner journal text
 */
const DEEPGRAM_URL =
  "https://api.deepgram.com/v1/listen" +
  "?model=nova-3" +
  "&language=multi" +
  "&smart_format=true" +
  "&punctuate=true" +
  "&filler_words=false";

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
