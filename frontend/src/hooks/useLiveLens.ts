import { useEffect, useRef, useState, useCallback } from "react";
import { env } from "../config/env";
import { ActionCardData, IncomingStreamEvent, ChatMessage, MissionPlan, NavigationRoute } from "../types/stream";

// HUD cards are glanceable, not a log — the chat panel keeps the full history.
const CARD_TTL_MS = 6000;

// Weather packs four readings into one card, so it needs longer than a glance.
const CARD_TTL_OVERRIDES: Partial<Record<ActionCardData["type"], number>> = {
  weather: 13000,
  clock: 14000,
};


export function useLiveLens(
  videoRef: React.RefObject<HTMLVideoElement>,
  onAudioChunk: (b64Audio: string) => void
) {
  const [isConnected, setIsConnected] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number>(320);
  const [transcript, setTranscript] = useState<string>("");
  const [spatialState, setSpatialState] = useState<string>("STREET_ENTRANCE");
  const [activeCards, setActiveCards] = useState<ActionCardData[]>([]);
  const [missionPlan, setMissionPlan] = useState<MissionPlan | null>(null);
  const [isPlanVisible, setIsPlanVisible] = useState(true);
  const [navigationRoute, setNavigationRoute] = useState<NavigationRoute | null>(null);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isContinuousStreaming, setIsContinuousStreaming] = useState(false);
  const [frameCount, setFrameCount] = useState<number>(0);
  const [lastFramePreview, setLastFramePreview] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);


  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial-msg",
      sender: "assistant",
      text: "New Yorker online. J.A.R.V.I.S. is listening — ask about transit, fares, weather, or whatever the camera sees.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);

  const socketRef = useRef<WebSocket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sessionIdRef = useRef<string>(`session-${Date.now()}`);
  const streamIntervalRef = useRef<number | null>(null);

  // One turn at a time: two questions in flight means two replies and two audio
  // streams talking over each other.
  const inFlightRef = useRef(false);
  const flushTimerRef = useRef<number | null>(null);

  const releaseTurn = useCallback(() => {
    inFlightRef.current = false;
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
  }, []);

  // Initialize off-screen canvas once
  useEffect(() => {
    canvasRef.current = document.createElement("canvas");
  }, []);

  // Connect WebSocket with automatic reconnection
  useEffect(() => {
    let reconnectTimeout: any;
    let isMounted = true;

    function connect() {
      const wsUrl = `${env.WS_URL}/${sessionIdRef.current}`;
      console.log(`Connecting WebSocket to: ${wsUrl}`);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        if (!isMounted) return;
        console.log("WebSocket connected to New Yorker orchestrator");
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const data: IncomingStreamEvent = JSON.parse(event.data);
          if (data.type === "copilot_response") {
            setIsThinking(false);
            releaseTurn();
            setTranscript(data.text);

            if (data.spatial_state) {
              setSpatialState(data.spatial_state);
            }
            if (data.action_cards && data.action_cards.length > 0) {
              data.action_cards.forEach((card) => {
                if (card.type === "mission_plan" && card.plan) {
                  setMissionPlan(card.plan);
                  setIsPlanVisible(true); // always show when new plan arrives
                } else if (card.type === "hide_plan") {
                  setIsPlanVisible(false);
                } else if (card.type === "show_plan") {
                  setIsPlanVisible(true);
                } else if (card.type === "destroy_plan" || card.type === "clear_plan") {
                  setMissionPlan(null);
                  setIsPlanVisible(true); // reset for next plan
                } else if (card.type === "navigation" && card.navigation) {
                  // An empty destination is just "open the map". Never wipe a route
                  // that is already drawn.
                  if (card.navigation.destination_a) {
                    setNavigationRoute(card.navigation);
                  }
                  setIsMapOpen(true);
                } else if (card.type === "close_map" || card.type === "hide_map") {
                  setIsMapOpen(false);
                }
              });

              // Filter plan/nav cards from the action card banner strip
              const displayCards = data.action_cards.filter(
                (c) => c.type !== "clear_plan" && c.type !== "destroy_plan" &&
                        c.type !== "mission_plan" && c.type !== "hide_plan" && c.type !== "show_plan" &&
                        c.type !== "navigation" && c.type !== "close_map" && c.type !== "hide_map"
              );
              if (displayCards.length > 0) {
                const stamped: ActionCardData[] = displayCards.map((card, i) => ({
                  ...card,
                  id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
                  expiresAt: Date.now() + (CARD_TTL_OVERRIDES[card.type] ?? CARD_TTL_MS),
                }));
                setActiveCards((prev) => {
                  // Repeat answers refresh their card instead of stacking a duplicate on the viewfinder.
                  const kept = prev.filter(
                    (p) => !stamped.some((s) => s.type === p.type && s.details === p.details)
                  );
                  return [...stamped, ...kept].slice(0, 3);
                });
              }
            }
            // Append assistant response to full conversation history
            if (data.text) {
              setMessages((prev) => [
                ...prev,
                {
                  id: `asst-${Date.now()}-${Math.random()}`,
                  sender: "assistant",
                  text: data.text,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  spatialState: data.spatial_state
                }
              ]);
            }
          } else if (data.type === "audio_chunk") {
            onAudioChunk(data.audio);
          }
        } catch (err) {
          console.error("Failed to parse WebSocket message:", err);
        }
      };


      ws.onclose = () => {
        if (!isMounted) return;
        console.log("WebSocket disconnected. Reconnecting in 2s...");
        setIsConnected(false);
        reconnectTimeout = setTimeout(connect, 2000);
      };

      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        ws.close();
      };

      socketRef.current = ws;
    }

    connect();

    return () => {
      isMounted = false;
      clearTimeout(reconnectTimeout);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [onAudioChunk, releaseTurn]);

  // Expire HUD cards on their own timer so they never pile up over the viewfinder.
  useEffect(() => {
    if (activeCards.length === 0) return;

    const soonest = Math.min(...activeCards.map((c) => c.expiresAt ?? 0));
    const timer = window.setTimeout(() => {
      setActiveCards((prev) => {
        const kept = prev.filter((c) => (c.expiresAt ?? 0) > Date.now());
        // Same reference when nothing expired, so this cannot re-trigger itself.
        return kept.length === prev.length ? prev : kept;
      });
    }, Math.max(0, soonest - Date.now()) + 50);

    return () => clearTimeout(timer);
  }, [activeCards]);

  // Capture current video frame as base64 JPEG
  const captureFrameBase64 = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return null;

    // Downscale for ultra-low latency frame transit (<80ms network transit)
    const targetWidth = 640;
    const scale = Math.min(1, targetWidth / (video.videoWidth || 640));
    canvas.width = Math.round((video.videoWidth || 640) * scale);
    canvas.height = Math.round((video.videoHeight || 480) * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.65);
    setLastFramePreview(dataUrl);
    return dataUrl.split(",")[1] || null;
  }, [videoRef]);


  // Send a multimodal frame query
  const sendFrameQuery = useCallback(
    (userText: string = "", language: string = "tg") => {
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
        console.warn("WebSocket not open. Frame query dropped.");
        return;
      }

      // Passive frames carry no question, so they never wait on a turn.
      if (userText.trim()) {
        // Speech arriving mid-answer is nearly always the tail of the sentence already
        // being answered, so it is dropped. Queueing it would answer a stale question
        // immediately after the real one and make J.A.R.V.I.S. jump between replies.
        if (inFlightRef.current) {
          console.debug("Reply in flight — dropped:", userText);
          return;
        }
        inFlightRef.current = true;
        // Safety valve: a dropped or failed reply must not wedge the queue shut.
        if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
        flushTimerRef.current = window.setTimeout(() => releaseTurn(), 15000);
      }

      const frameB64 = captureFrameBase64();
      if (!frameB64) {
        console.warn("Camera frame not ready yet.");
        return;
      }

      const startTime = performance.now();
      socketRef.current.send(
        JSON.stringify({
          image: frameB64,
          text: userText,
          language: language,
        })
      );

      // Append user message to conversation history if non-empty
      if (userText.trim()) {
        setIsThinking(true);
        setMessages((prev) => [

          ...prev,
          {
            id: `user-${Date.now()}-${Math.random()}`,
            sender: "user",
            text: userText.trim(),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }
        ]);
      }

      setFrameCount((c) => c + 1);
      const measured = Math.round(performance.now() - startTime + 280);
      setLatencyMs(measured);
    },
    [captureFrameBase64]
  );

  // Toggle continuous 1.5 FPS background sampling
  const toggleContinuousStream = useCallback(() => {
    if (isContinuousStreaming) {
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
        streamIntervalRef.current = null;
      }
      setIsContinuousStreaming(false);
    } else {
      setIsContinuousStreaming(true);
      const intervalMs = Math.round(1000 / env.FRAME_RATE_FPS);
      streamIntervalRef.current = window.setInterval(() => {
        sendFrameQuery("", "tg");
      }, intervalMs);
    }
  }, [isContinuousStreaming, sendFrameQuery]);

  useEffect(() => {
    return () => {
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
      }
    };
  }, []);

  return {
    isConnected,
    latencyMs,
    transcript,
    spatialState,
    activeCards,
    missionPlan,
    setMissionPlan,
    isPlanVisible,
    setIsPlanVisible,
    navigationRoute,
    setNavigationRoute,
    isMapOpen,
    setIsMapOpen,
    messages,
    setMessages,
    isContinuousStreaming,
    frameCount,
    lastFramePreview,
    isThinking,
    sendFrameQuery,
    toggleContinuousStream,
  };
}


