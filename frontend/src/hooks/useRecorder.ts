"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { getSupportedMimeType, formatDuration, downloadBlob } from "@/lib/recording";

export interface UseRecorderReturn {
  isRecording: boolean;
  elapsedSeconds: number;
  formattedTime: string;
  recordingError: string | null;
  startRecording: () => void;
  stopRecording: () => void;
}

export function useRecorder(stream: MediaStream | null): UseRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [recordingError, setRecordingError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mimeTypeRef = useRef<string>("");

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startRecording = useCallback(() => {
    if (!stream) {
      return;
    }
    // Guard against rapid clicks or already recording
    if (isRecording || (recorderRef.current && recorderRef.current.state !== "inactive")) {
      return;
    }

    try {
      setRecordingError(null);
      chunksRef.current = [];
      setElapsedSeconds(0);

      const mimeType = getSupportedMimeType();
      mimeTypeRef.current = mimeType;

      const options: MediaRecorderOptions = {
        mimeType,
        videoBitsPerSecond: 2_500_000,
        audioBitsPerSecond: 128_000,
      };

      const recorder = new MediaRecorder(stream, options);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (event: Event) => {
        const errObj = (event as any).error;
        const msg = errObj?.message || "MediaRecorder error encountered";
        setRecordingError(msg);
      };

      recorder.onstop = () => {
        const finalMimeType = mimeTypeRef.current || "video/webm";
        const blob = new Blob(chunksRef.current, { type: finalMimeType });

        if (blob.size > 0) {
          const timestamp = new Date().toISOString().replace(/:/g, "-");
          const filename = `streamly-recording-${timestamp}.webm`;
          downloadBlob(blob, filename);
        }

        chunksRef.current = [];
        setIsRecording(false);
        setElapsedSeconds(0);
        stopTimer();
      };

      recorder.start(1000);
      setIsRecording(true);

      const startTime = Date.now();
      stopTimer();
      timerRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      }, 500);
    } catch (err: any) {
      setRecordingError(err?.message || "Failed to start recording");
      setIsRecording(false);
      stopTimer();
    }
  }, [stream, isRecording, stopTimer]);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      return;
    }

    try {
      recorder.stop();
    } catch (err) {
      console.error("Error stopping MediaRecorder:", err);
    } finally {
      stopTimer();
    }
  }, [stopTimer]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch {
          // ignore unmount cleanup errors
        }
      }
    };
  }, [stopTimer]);

  return {
    isRecording,
    elapsedSeconds,
    formattedTime: formatDuration(elapsedSeconds),
    recordingError,
    startRecording,
    stopRecording,
  };
}
