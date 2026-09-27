import React from "react";

export type JarvisState = "idle" | "listening" | "thinking" | "speaking";

interface JarvisOrbProps {
  state: JarvisState;
  onClick?: () => void;
  className?: string;
}

export const JarvisOrb: React.FC<JarvisOrbProps> = ({ state, onClick, className = "" }) => {
  // Label and status text
  const stateLabels: Record<JarvisState, { title: string; color: string; desc: string }> = {
    idle: {
      title: "STANDBY",
      color: "text-stark-cyan/60",
      desc: "READY FOR INPUT",
    },
    listening: {
      title: "LISTENING",
      color: "text-stark-gold",
      desc: "HEARING VOICE...",
    },
    thinking: {
      title: "COMPUTING",
      color: "text-purple-400",
      desc: "REASONING & VISION...",
    },
    speaking: {
      title: "SPEAKING",
      color: "text-stark-cyan",
      desc: "VOICE SYNTHESIS ACTIVE",
    },
  };

  const current = stateLabels[state];

  // Dynamic animations based on state
  const isListening = state === "listening";
  const isThinking = state === "thinking";
  const isSpeaking = state === "speaking";

  return (
    <div
      onClick={onClick}
      className={`relative flex items-center gap-3.5 p-2 px-3 rounded-lg stark-panel stark-cut border transition-all cursor-pointer select-none overflow-hidden ${
        isSpeaking
          ? "border-stark-cyan shadow-lg shadow-cyan-500/20"
          : isListening
          ? "border-stark-gold shadow-lg shadow-amber-500/20"
          : isThinking
          ? "border-purple-400 shadow-lg shadow-purple-500/20"
          : "border-stark-cyan/30 hover:border-stark-cyan/60"
      } ${className}`}
    >
      {/* Mini Arc Reactor Holographic Orb */}
      <div className="relative w-14 h-14 flex items-center justify-center flex-shrink-0">
        {/* Outer Ring with Tick Marks */}
        <div
          className={`absolute inset-0 rounded-full border border-dashed transition-all duration-700 ${
            isSpeaking
              ? "border-stark-cyan animate-spin [animation-duration:4s]"
              : isThinking
              ? "border-purple-400 animate-spin [animation-duration:2s]"
              : isListening
              ? "border-stark-gold animate-spin [animation-duration:8s]"
              : "border-stark-cyan/30"
          }`}
        />

        {/* Counter-rotating Middle Ring */}
        <div
          className={`absolute inset-1.5 rounded-full border transition-all duration-500 ${
            isSpeaking
              ? "border-cyan-400/80 animate-ping [animation-duration:1.5s]"
              : isThinking
              ? "border-purple-300 animate-pulse"
              : isListening
              ? "border-amber-400/80 animate-ping [animation-duration:2s]"
              : "border-cyan-500/20"
          }`}
        />

        {/* Middle Arc Segment */}
        <div
          className={`absolute inset-2.5 rounded-full border-2 border-transparent transition-all ${
            isSpeaking
              ? "border-t-stark-cyan border-r-stark-cyan animate-spin [animation-duration:1s]"
              : isThinking
              ? "border-t-purple-400 border-b-purple-400 animate-spin [animation-duration:0.8s]"
              : isListening
              ? "border-t-stark-gold border-l-stark-gold animate-spin [animation-duration:2s]"
              : "border-t-stark-cyan/40"
          }`}
        />

        {/* Core Glowing Center */}
        <div
          className={`relative w-6 h-6 rounded-full flex items-center justify-center transition-all ${
            isSpeaking
              ? "bg-stark-cyan shadow-lg shadow-cyan-400 scale-110"
              : isThinking
              ? "bg-purple-500 shadow-lg shadow-purple-400 animate-pulse scale-105"
              : isListening
              ? "bg-stark-gold shadow-lg shadow-amber-400 scale-110"
              : "bg-cyan-950/80 border border-stark-cyan/50"
          }`}
        >
          {/* Inner Core Eye */}
          <div
            className={`w-2 h-2 rounded-full transition-all ${
              isSpeaking
                ? "bg-white animate-ping"
                : isThinking
                ? "bg-white animate-pulse"
                : isListening
                ? "bg-black animate-ping"
                : "bg-stark-cyan/50"
            }`}
          />
        </div>
      </div>

      {/* Holographic Text Status & Live Visualizer Bars */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-white stark-text-glow">
              J.A.R.V.I.S.
            </span>
            <span className="text-[9px] text-gray-400 font-mono">//</span>
            <span className={`text-[9px] font-black tracking-wider uppercase ${current.color}`}>
              {current.title}
            </span>
          </div>

          {/* Equalizer Waveform Bars */}
          <div className="flex items-center space-x-0.5 h-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <span
                key={i}
                className={`w-0.5 rounded-full transition-all duration-150 ${
                  isSpeaking
                    ? "bg-stark-cyan animate-bounce"
                    : isListening
                    ? "bg-stark-gold animate-pulse"
                    : isThinking
                    ? "bg-purple-400 animate-pulse"
                    : "bg-stark-cyan/20 h-1"
                }`}
                style={{
                  height: isSpeaking
                    ? `${(i % 3 + 1) * 4}px`
                    : isListening
                    ? `${(i % 2 + 1) * 3}px`
                    : isThinking
                    ? "6px"
                    : "2px",
                  animationDelay: `${i * 120}ms`,
                }}
              />
            ))}
          </div>
        </div>

        <span className="text-[9px] text-gray-300 font-mono tracking-wider mt-0.5 truncate">
          {current.desc}
        </span>
      </div>
    </div>
  );
};
