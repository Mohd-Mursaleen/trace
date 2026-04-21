import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import { useCallback, useState } from "react";
import { Alert, Platform } from "react-native";

import { transcribeAudio, DEEPGRAM_KEY } from "@/lib/deepgram";

export type VoiceState = "idle" | "recording" | "processing" | "error";

export function useVoiceRecorder(onTranscript: (text: string) => void) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [state, setState] = useState<VoiceState>("idle");
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async () => {
    setError(null);
    if (!DEEPGRAM_KEY) {
      setError("Voice transcription is not configured.");
      Alert.alert("Voice unavailable", "Deepgram API key is not configured.");
      return;
    }
    if (Platform.OS === "web") {
      setError("Voice recording is not supported in the web preview.");
      Alert.alert("Voice unavailable", "Try this on iOS or Android.");
      return;
    }
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setError("Microphone permission denied.");
        Alert.alert("Permission needed", "Allow microphone access to record voice notes.");
        return;
      }
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setState("recording");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start recording.");
      setState("error");
    }
  }, [recorder]);

  const stop = useCallback(async () => {
    try {
      setState("processing");
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) {
        setState("idle");
        return;
      }
      const text = await transcribeAudio(uri, "audio/m4a");
      if (text) onTranscript(text);
      setState("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transcription failed.");
      setState("error");
      setTimeout(() => setState("idle"), 1500);
    }
  }, [recorder, onTranscript]);

  const cancel = useCallback(async () => {
    try {
      await recorder.stop();
    } catch {
      // ignore
    }
    setState("idle");
  }, [recorder]);

  return { state, error, start, stop, cancel };
}
