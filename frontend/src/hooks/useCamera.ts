import { useEffect, useRef, useState, useCallback } from "react";
import { forceLoudSpeaker, keepLoudSpeaker, resolveLoudSink } from "../lib/loudSpeaker";

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("user"); // Default to user on laptop
  const [isStreaming, setIsStreaming] = useState(false);

  const startCamera = useCallback(async (mode: "environment" | "user") => {
    // Clean up existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (firstErr: any) {
        console.warn(`Camera mode ${mode} unavailable, trying fallback:`, firstErr);
        // Fallback to any available webcam
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      // Permission was granted successfully!
      streamRef.current = stream;
      setHasPermission(true);
      setError(null);

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        // A live preview must never become an audio output, or iPad sends
        // Jarvis to the small speaker next to the front camera.
        video.muted = true;
        video.defaultMuted = true;
        video.volume = 0;
        video.playsInline = true;
        video.setAttribute("playsinline", "true");
        video.setAttribute("webkit-playsinline", "true");
        keepLoudSpeaker();
        video.play().then(() => {
          // The preview starting is when iPad moves sound to the small speaker.
          forceLoudSpeaker();
          void resolveLoudSink();
          setIsStreaming(true);
        }).catch((playErr: any) => {
          if (playErr.name === "AbortError") {
            // Normal in React StrictMode when component quickly re-renders
            console.log("Play interrupted by React StrictMode re-render; ignoring.");
          } else {
            console.warn("Video play warning:", playErr);
          }
        });
      }
    } catch (err: any) {
      console.error("Camera access failed:", err);
      // Only set error if getUserMedia actually failed (permission denied / device not found)
      setError(err.message || "Failed to access camera");
      setHasPermission(false);
      setIsStreaming(false);
    }
  }, []);

  const toggleCamera = useCallback(() => {
    const nextMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextMode);
    startCamera(nextMode);
  }, [facingMode, startCamera]);

  const retryCamera = useCallback(() => {
    startCamera(facingMode);
  }, [facingMode, startCamera]);

  useEffect(() => {
    startCamera(facingMode);

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [startCamera]);

  return {
    videoRef,
    hasPermission,
    error,
    facingMode,
    isStreaming,
    toggleCamera,
    retryCamera,
  };
}
