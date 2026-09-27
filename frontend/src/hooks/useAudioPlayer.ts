import { useRef, useCallback, useEffect, useState } from "react";
import { attachLoudSpeaker, keepLoudSpeaker } from "../lib/loudSpeaker";


export function useAudioPlayer() {
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize or resume AudioContext after first user tap
  const ensureAudioContext = useCallback(() => {
    keepLoudSpeaker();
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioCtx();
    }
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }
  }, []);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  // Set by the stop button. A reply already in flight must not start talking
  // after the user has silenced him; the next question clears it.
  const silencedRef = useRef(false);

  const haltPlayback = useCallback(() => {
    const audio = currentAudioRef.current;
    if (!audio) return;
    audio.onended = null;
    audio.pause();
    audio.currentTime = 0;
    currentAudioRef.current = null;
  }, []);

  const stopSpeaking = useCallback(() => {
    silencedRef.current = true;
    haltPlayback();
    setIsSpeaking(false);
  }, [haltPlayback]);

  const allowSpeech = useCallback(() => {
    silencedRef.current = false;
  }, []);

  const playAudioChunk = useCallback(async (base64Audio: string) => {
    if (silencedRef.current) return;
    try {
      // Decode base64 to binary byte array
      const binaryString = window.atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create MP3 blob and play cleanly without WebAudio slicing artifacts
      const blob = new Blob([bytes], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);

      haltPlayback();
      if (silencedRef.current) {
        URL.revokeObjectURL(url);
        return;
      }

      const audio = new Audio(url);
      audio.volume = 1;
      audio.setAttribute("playsinline", "true");
      currentAudioRef.current = audio;
      setIsSpeaking(true);

      audio.onended = () => {
        URL.revokeObjectURL(url);
        setIsSpeaking(false);
        if (currentAudioRef.current === audio) {
          currentAudioRef.current = null;
        }
      };

      audio.onerror = () => {
        setIsSpeaking(false);
      };

      // Bind the loud speaker before play. The front camera otherwise keeps
      // this element on the small speaker for the whole clip.
      await attachLoudSpeaker(audio);
      if (silencedRef.current) {
        haltPlayback();
        URL.revokeObjectURL(url);
        return;
      }
      await audio.play();
      if (silencedRef.current) haltPlayback();
    } catch (e) {
      setIsSpeaking(false);
      console.error("Error playing audio:", e);
    }
  }, [haltPlayback]);

  // Same player as the streamed replies, so the stop button catches direct TTS too.
  const playUrl = useCallback((url: string) => {
    if (silencedRef.current) return;
    haltPlayback();
    const audio = new Audio(url);
    audio.volume = 1;
    audio.setAttribute("playsinline", "true");
    currentAudioRef.current = audio;
    setIsSpeaking(true);
    audio.onended = () => {
      setIsSpeaking(false);
      if (currentAudioRef.current === audio) currentAudioRef.current = null;
    };
    audio.onerror = () => setIsSpeaking(false);
    attachLoudSpeaker(audio)
      .then(() => {
        if (silencedRef.current) {
          haltPlayback();
          return;
        }
        return audio.play();
      })
      .catch((err) => {
        setIsSpeaking(false);
        console.error("Audio playback error:", err);
      });
  }, [haltPlayback]);


  useEffect(() => {
    keepLoudSpeaker();
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return { playAudioChunk, playUrl, stopSpeaking, allowSpeech, ensureAudioContext, isSpeaking };


}
