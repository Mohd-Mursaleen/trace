import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from "expo-audio";
import { useCallback, useState } from "react";
import { Alert, Platform } from "react-native";

import { DEEPGRAM_KEY, transcribeAudio } from "@/lib/deepgram";

export type VoiceState = "idle" | "recording" | "processing" | "error";

/**
 * Simple batch voice transcription — Expo Go compatible.
 *
 * Flow:
 *   tap start → mic opens → user speaks → tap stop
 *   → recorder.stop() → POST file to Deepgram → onTranscript called → idle
 *
 * Accuracy is higher than chunked because Deepgram gets the full utterance
 * with complete sentence context rather than arbitrary 3s windows.
 */
export function useVoiceRecorder(onTranscript: (text: string) => void) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [state, setState] = useState<VoiceState>("idle");

  const start = useCallback(async () => {
    if (!DEEPGRAM_KEY) {
      Alert.alert("Voice unavailable", "Deepgram API key is not configured.");
      return;
    }
    if (Platform.OS === "web") {
      Alert.alert("Voice unavailable", "Try this on iOS or Android.");
      return;
    }
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission needed", "Allow microphone access to record voice notes.");
        return;
      }
      // iOS requires allowsRecording: true before the recorder can start.
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setState("recording");
    } catch (e) {
      if (__DEV__) console.warn("[voice] start failed:", e);
      setState("error");
      setTimeout(() => setState("idle"), 1500);
    }
  }, [recorder]);

  const stop = useCallback(async () => {
    setState("processing");
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (uri) {
        const transcript = await transcribeAudio(uri, "audio/m4a");
        if (transcript) onTranscript(transcript);
      }
    } catch (e) {
      if (__DEV__) console.warn("[voice] transcribe failed:", e);
    }
    setState("idle");
  }, [recorder, onTranscript]);

  const cancel = useCallback(async () => {
    try { await recorder.stop(); } catch {}
    setState("idle");
  }, [recorder]);

  return { state, error: null as string | null, interim: "", start, stop, cancel };
}
