import { useState, useRef, useEffect } from "react";
import { useCamera } from "./hooks/useCamera";
import { useAudioPlayer } from "./hooks/useAudioPlayer";
import { useLiveLens } from "./hooks/useLiveLens";
import { CameraView } from "./components/CameraView";
import { StatusBar } from "./components/StatusBar";
import { ActionCard } from "./components/ActionCard";
import { PlanDashboard } from "./components/PlanDashboard";
import { ChatPanel } from "./components/ChatPanel";
import { JarvisOrb, JarvisState } from "./components/JarvisOrb";
import { HealthPage } from "./components/HealthPage";
import { MapView } from "./components/MapView";
import { Send, Eye, Radio, Square, Map, VolumeX } from "lucide-react";
import { env } from "./config/env";
import { keepLoudSpeaker } from "./lib/loudSpeaker";

// Spoken language switches. Chrome cannot auto-detect, so the recognizer has to be
// told which language to expect — these phrases are how the user tells J.A.R.V.I.S.
const SWITCH_TO_RUSSIAN =
  /\b(switch|change|talk|speak|go|respond|answer|reply|language|say)\b[^.!?]{0,24}\brussian\b|\b(to|in|into|on)\s+russian\b|\brussian\b\s*(language|please|mode)\b|русск[а-яё]*/i;
const SWITCH_TO_ENGLISH =
  /\b(switch|change|talk|speak|go|respond|answer|reply|language|say)\b[^.!?]{0,24}\benglish\b|\b(to|in|into|on)\s+english\b|\benglish\b\s*(language|please|mode)\b|англ[а-яё]*/i;



export function App() {
  const [currentView, setCurrentView] = useState<"camera" | "health">(
    window.location.pathname === "/health" ? "health" : "camera"
  );
  const [speechLang, setSpeechLang] = useState<"en-US" | "ru-RU">("en-US");
  const [customQuery, setCustomQuery] = useState("");
  const [isLiveTalk, setIsLiveTalk] = useState(false);
  const [isListeningSpeech, setIsListeningSpeech] = useState(false);
  const recognitionRef = useRef<any>(null);
  // Refs mirror the state because the recognition callbacks close over stale values.
  const speechLangRef = useRef<"en-US" | "ru-RU">("en-US");
  const isLiveTalkRef = useRef(false);
  const langCode = () => (speechLangRef.current === "ru-RU" ? "ru" : "en");

  // Chrome closes a "final" result at every small pause, so one spoken sentence can
  // arrive in three pieces. They are stitched back together and only sent once the
  // user has actually stopped talking, so one question gets exactly one answer.
  const utteranceRef = useRef<string[]>([]);
  const utteranceTimerRef = useRef<number | null>(null);
  const END_OF_SPEECH_MS = 750;

  const { videoRef, hasPermission, error, facingMode, toggleCamera, retryCamera } = useCamera();
  const { playAudioChunk, playUrl, stopSpeaking, allowSpeech, ensureAudioContext, isSpeaking } = useAudioPlayer();

  const {
    isConnected,
    latencyMs,
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
    isThinking,
    sendFrameQuery,
    toggleContinuousStream,
  } = useLiveLens(videoRef, playAudioChunk);

  // Compute current Jarvis orb status
  const jarvisState: JarvisState = isSpeaking
    ? "speaking"
    : isThinking
    ? "thinking"
    : isListeningSpeech
    ? "listening"
    : "idle";


  // Play audio from direct TTS URL
  const handleDirectSpeak = (text: string) => {
    ensureAudioContext();
    allowSpeech();
    playUrl(`${env.API_URL}/api/tts?text=${encodeURIComponent(text)}`);
  };

  // Chrome only honours a new recognizer language after a fresh start.
  const applySpeechLang = (lang: "en-US" | "ru-RU") => {
    speechLangRef.current = lang;
    setSpeechLang(lang);

    const recognition = recognitionRef.current;
    if (!recognition) return;
    recognition.lang = lang;
    try {
      recognition.stop();
    } catch (e) {}
    setTimeout(() => {
      try {
        recognition.start();
      } catch (e) {}
    }, 300);
  };

  // Returns true when the utterance was a language switch and should not reach the backend.
  const handleLanguageSwitch = (spoken: string): boolean => {
    const wantsRussian = SWITCH_TO_RUSSIAN.test(spoken);
    const wantsEnglish = SWITCH_TO_ENGLISH.test(spoken);
    if (!wantsRussian && !wantsEnglish) return false;

    const target: "en-US" | "ru-RU" = wantsRussian ? "ru-RU" : "en-US";
    const confirmation =
      target === "ru-RU"
        ? "Переключаюсь на русский. Слушаю вас."
        : "Switching back to English. Go ahead.";

    if (speechLangRef.current !== target) {
      applySpeechLang(target);
    }

    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        sender: "user",
        text: spoken,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
      {
        id: `asst-${Date.now()}`,
        sender: "assistant",
        text: confirmation,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    handleDirectSpeak(confirmation);
    return true;
  };

  // Send a custom text query along with current camera frame
  const handleCustomAsk = () => {
    if (!customQuery.trim()) return;
    ensureAudioContext();
    allowSpeech();
    sendFrameQuery(customQuery.trim(), langCode());
    setCustomQuery("");
  };

  // Quick Home Scan button
  const handleHomeScan = () => {
    ensureAudioContext();
    allowSpeech();
    sendFrameQuery("Describe in 1 to 2 crisp sentences what object or room you see in front of the camera.", "en");
  };

  // Toggle Live Talk mode (speech recognition & continuous visual streaming)
  const toggleLiveTalk = () => {
    ensureAudioContext();
    if (isLiveTalk) {
      // Turn off live talk cleanly
      setIsLiveTalk(false);
      isLiveTalkRef.current = false;
      setIsListeningSpeech(false);
      // Drop any half-spoken sentence so it cannot fire after the mic is off.
      if (utteranceTimerRef.current) clearTimeout(utteranceTimerRef.current);
      utteranceTimerRef.current = null;
      utteranceRef.current = [];
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      if (isContinuousStreaming) {
        toggleContinuousStream();
      }
    } else {
      // Turn on live talk. The mic would otherwise drop Jarvis onto the small speaker.
      keepLoudSpeaker();
      setIsLiveTalk(true);
      isLiveTalkRef.current = true;
      if (!isContinuousStreaming) {
        toggleContinuousStream();
      }

      // Initialize Web Speech API if supported
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = speechLangRef.current;


        let lastSpokenText = "";
        let lastSpokenTime = 0;

        recognition.onstart = () => {
          setIsListeningSpeech(true);
        };

        recognition.onresult = (event: any) => {
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (!event.results[i].isFinal) continue;

            const fragment = event.results[i][0].transcript.trim();
            if (!fragment) continue;
            utteranceRef.current.push(fragment);

            if (utteranceTimerRef.current) clearTimeout(utteranceTimerRef.current);
            utteranceTimerRef.current = window.setTimeout(() => {
              const spoken = utteranceRef.current.join(" ").trim();
              utteranceRef.current = [];
              utteranceTimerRef.current = null;
              if (!spoken) return;

              const now = Date.now();
              // Guards against our own speech echoing back as the same phrase.
              if (spoken === lastSpokenText && now - lastSpokenTime < 3000) return;
              lastSpokenText = spoken;
              lastSpokenTime = now;

              if (!handleLanguageSwitch(spoken)) {
                allowSpeech();
                sendFrameQuery(spoken, langCode());
              }
            }, END_OF_SPEECH_MS);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn("Speech recognition error:", event.error);
        };


        recognition.onend = () => {
          // Chrome ends recognition after every pause, so restart or the mic goes
          // permanently deaf. Reads the ref because the closure captured isLiveTalk=false.
          if (isLiveTalkRef.current) {
            try {
              recognition.start();
            } catch (e) {}
          } else {
            setIsListeningSpeech(false);
          }
        };

        try {
          keepLoudSpeaker();
          recognition.start();
          recognitionRef.current = recognition;
        } catch (e) {
          console.error("Speech start error:", e);
        }
      }
    }
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  if (currentView === "health") {
    return <HealthPage onBack={() => setCurrentView("camera")} />;
  }

  return (
    <div className="relative w-full h-dvh max-h-dvh overflow-hidden flex flex-col bg-stark-dark select-none font-mono text-white p-2 sm:p-4 gap-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      {/* 1. Top HUD Header Bar */}
      <StatusBar
        isConnected={isConnected}
        latencyMs={latencyMs}
        currentLanguage={speechLang === "ru-RU" ? "ru" : "en"}
        spatialState={spatialState}
        facingMode={facingMode}
        onToggleCamera={toggleCamera}
        isContinuousStreaming={isContinuousStreaming}
        onToggleContinuous={toggleContinuousStream}
        frameCount={frameCount}
      />

      {/* 2. Main Two-Column Viewport: Viewfinder (Left) + Chat Stream (Right) */}
      <div className="flex-1 min-h-0 min-w-0 grid grid-cols-1 md:grid-cols-12 gap-3 relative z-10">
        
        {/* LEFT PANE (col 7): Interactive Camera Viewfinder + Telemetry */}
        <div className="md:col-span-7 flex flex-col h-full min-h-0 min-w-0 gap-2 relative">
          {/* Camera Viewfinder */}
          <div className="relative flex-1 min-h-0 rounded-lg overflow-hidden border border-stark-cyan/30 shadow-2xl bg-black">
            <CameraView
              videoRef={videoRef}
              hasPermission={hasPermission}
              error={error}
              onRetry={retryCamera}
              spatialState={spatialState}
              hasActivePlan={Boolean(missionPlan)}
            >
              {/* Live Talk HUD Overlay Banner */}
              {isLiveTalk && (
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between px-3 py-1.5 rounded stark-cut bg-stark-red/20 border border-stark-red/60 backdrop-blur-md animate-pulse z-20">
                  <div className="flex items-center space-x-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-stark-red shadow-lg shadow-red-500 animate-ping" />
                    <span className="text-[11px] font-black uppercase tracking-widest text-stark-red stark-text-glow">
                      ● LIVE TALK ACTIVE // MICROPHONE & VISION LINKED
                    </span>
                  </div>
                  <span className="text-[9px] text-gray-300 font-mono tracking-wider">
                    {isListeningSpeech ? "LISTENING..." : "STREAMING 1.5 FPS"}
                  </span>
                </div>
              )}

              {/* Action Cards Container */}
              <div className="absolute top-12 left-3 right-3 space-y-2 pointer-events-none z-20">
                {activeCards.map((card, idx) => (
                  <div key={card.id ?? idx} className="pointer-events-auto">
                    <ActionCard card={card} />
                  </div>
                ))}
              </div>

              {/* Live Mission Plan Dashboard Overlay (Max 6 Steps) */}
              {missionPlan && (
                <PlanDashboard
                  plan={missionPlan}
                  isVisible={isPlanVisible}
                  onHide={() => setIsPlanVisible(false)}
                  onShow={() => setIsPlanVisible(true)}
                  onDestroy={() => { setMissionPlan(null); setIsPlanVisible(true); }}
                />
              )}

              {/* Google Maps Navigation Overlay — fills the full camera pane */}
              {isMapOpen && (
                <MapView
                  navigationRoute={navigationRoute}
                  onClose={() => {
                    setIsMapOpen(false);
                    setNavigationRoute(null);
                  }}
                />
              )}
            </CameraView>
          </div>

          {/* Core Controls: Live Talk Button + Quick Scan + Map Toggle */}
          <div className="stark-panel stark-cut rounded p-2 flex flex-wrap items-center justify-between gap-2 shadow-2xl relative z-30 shrink-0 bg-black/70">
            <div className="corner-tl" />
            <div className="corner-tr" />

            {/* Master Live Talk Toggle Button */}
            <button
              onClick={toggleLiveTalk}
              className={`shrink-0 whitespace-nowrap flex items-center justify-center py-2.5 px-3 rounded stark-cut border text-xs font-black tracking-wider transition-all active:scale-95 ${
                isLiveTalk
                  ? "bg-stark-red/30 border-stark-red text-stark-red shadow-lg shadow-red-900/50 animate-pulse"
                  : "bg-stark-cyan/20 hover:bg-stark-cyan/30 border-stark-cyan text-stark-cyan shadow-lg shadow-cyan-950/50"
              }`}
            >
              {isLiveTalk ? (
                <>
                  <Square className="w-4 h-4 mr-1.5 fill-current" />
                  <span>END LIVE TALK</span>
                </>
              ) : (
                <>
                  <Radio className="w-4 h-4 mr-1.5 animate-pulse" />
                  <span>START LIVE TALK</span>
                </>
              )}
            </button>

            <button
              onClick={stopSpeaking}
              className={`shrink-0 whitespace-nowrap flex items-center justify-center py-2.5 px-3 rounded stark-cut border text-xs font-black tracking-wider transition-all active:scale-95 ${
                isSpeaking
                  ? "bg-stark-red/30 border-stark-red text-stark-red shadow-lg shadow-red-900/50"
                  : "bg-white/5 hover:bg-stark-red/20 border-white/20 hover:border-stark-red text-gray-300 hover:text-stark-red"
              }`}
              title="Stop JARVIS talking"
            >
              <VolumeX className="w-4 h-4 mr-1.5" />
              <span>STOP</span>
            </button>

            {/* Quick Vision Scan Button */}
            <button
              onClick={handleHomeScan}
              className="shrink-0 whitespace-nowrap flex items-center justify-center py-2.5 px-3 rounded stark-cut bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400 text-emerald-300 text-xs font-bold active:scale-95 transition-all"
              title="Capture one frame and analyze"
            >
              <Eye className="w-3.5 h-3.5 mr-1" />
              <span>SCAN ROOM</span>
            </button>

            {/* Map Toggle Button */}
            <button
              onClick={() => setIsMapOpen((prev) => !prev)}
              className={`shrink-0 whitespace-nowrap flex items-center justify-center py-2.5 px-3 rounded stark-cut border text-xs font-bold active:scale-95 transition-all ${
                isMapOpen
                  ? "bg-stark-cyan/30 border-stark-cyan text-stark-cyan shadow-lg shadow-cyan-900/50"
                  : "bg-white/5 hover:bg-stark-cyan/20 border-white/20 hover:border-stark-cyan text-gray-300 hover:text-stark-cyan"
              }`}
              title="Toggle navigation map"
            >
              <Map className="w-3.5 h-3.5 mr-1" />
              <span>MAP</span>
            </button>

            {/* Diagnostics Link */}
            <button
              onClick={() => setCurrentView("health")}
              className="shrink-0 whitespace-nowrap px-2.5 py-2.5 rounded stark-cut bg-white/5 hover:bg-white/10 border border-white/20 text-gray-300 hover:text-white text-[10px] tracking-wider transition-all"
            >
              SYS
            </button>
          </div>
        </div>

        {/* RIGHT PANE (col 5): Whole Scrollable Conversation Chat */}
        <div className="md:col-span-5 flex flex-col h-full min-h-0 min-w-0 gap-2">
          {/* Scrollable Chat Panel */}
          <div className="flex-1 min-h-0">
            <ChatPanel
              messages={messages}
              onSpeak={handleDirectSpeak}
              onClear={() => setMessages([])}
            />
          </div>

          {/* Interactive Jarvis Holographic Orb (Idle / Listening / Thinking / Speaking) */}
          <JarvisOrb
            state={jarvisState}
            onClick={() => {
              if (isSpeaking) {
                // Clicking while speaking plays a test greeting
                handleDirectSpeak("New Yorker audio channels calibrated and clear.");
              } else if (!isLiveTalk) {
                toggleLiveTalk();
              }
            }}
          />

          {/* Interactive Chat Input Bar */}
          <div className="stark-panel stark-cut rounded p-1.5 flex items-center gap-2 shadow-2xl relative bg-black/80 border border-stark-cyan/40">
            <input
              type="text"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCustomAsk()}
              placeholder="Ask J.A.R.V.I.S. about your room, objects, or text..."
              className="flex-1 bg-transparent px-3 py-1.5 text-xs text-stark-cyan placeholder-stark-cyan/40 outline-none font-mono"
            />
            <button
              onClick={handleCustomAsk}
              className="px-3 py-1.5 bg-stark-cyan/25 hover:bg-stark-cyan/40 border border-stark-cyan text-stark-cyan rounded stark-cut text-xs font-bold flex items-center space-x-1 transition-all active:scale-95"
            >
              <Send className="w-3 h-3" />
              <span>SEND</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;

