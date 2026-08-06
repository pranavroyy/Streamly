import { useState, useCallback, useEffect, useRef } from "react";

export function useMediaDevices() {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState<boolean>(false);

  const localStreamRef = useRef<MediaStream | null>(null);

  const stopMedia = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      setLocalStream(null);
      localStreamRef.current = null;
    }
  }, []);

  const requestMedia = useCallback(async () => {
    setIsRequesting(true);
    setMediaError(null);
    
    // Ensure any existing stream is cleaned up first
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      localStreamRef.current = stream;
      setIsRequesting(false);
      return stream;
    } catch (err: any) {
      setIsRequesting(false);
      let errorMsg = "Failed to access media devices.";
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        errorMsg = "Camera/microphone access was denied.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        errorMsg = "No camera or microphone found on this device.";
      } else if (err.name === "NotReadableError") {
        errorMsg = "Your camera or mic is already in use by another application.";
      } else if (err.name === "OverconstrainedError") {
        errorMsg = "The requested media constraints cannot be satisfied by the devices.";
      } else if (err.message) {
        errorMsg = `Failed to access media devices: ${err.message}`;
      }
      setMediaError(errorMsg);
      setLocalStream(null);
      localStreamRef.current = null;
      throw err;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      }
    };
  }, []);

  return {
    localStream,
    mediaError,
    isRequesting,
    requestMedia,
    stopMedia,
  };
}
