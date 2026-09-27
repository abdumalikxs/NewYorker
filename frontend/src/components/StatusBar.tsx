import React from "react";
import { Zap, Camera, Radio, Cpu } from "lucide-react";

interface StatusBarProps {
  isConnected: boolean;
  latencyMs: number;
  currentLanguage: string;
  spatialState?: string;
  facingMode?: "environment" | "user";
  onToggleCamera?: () => void;
  isContinuousStreaming?: boolean;
  onToggleContinuous?: () => void;
  frameCount?: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  isConnected,
  latencyMs,
  currentLanguage,
  spatialState = "STREET_ENTRANCE",
  facingMode = "user",
  onToggleCamera,
  isContinuousStreaming = false,
  onToggleContinuous,
  frameCount = 0,
}) => {
  return (
    <header className="stark-panel stark-cut rounded px-4 py-2.5 flex items-center justify-between shadow-2xl relative font-mono text-xs">
      {/* Corner Tech Brackets */}
      <div className="corner-tl" />
      <div className="corner-tr" />

      {/* Brand: MTA-style subway bullet that doubles as the link indicator */}
      <div className="flex items-center space-x-2.5">
        <div className="relative flex items-center justify-center flex-shrink-0">
          <div
            className={`mta-bullet w-7 h-7 text-sm transition-all ${
              isConnected ? "mta-yellow mta-lit" : "mta-offline ring-1 ring-stark-red/70"
            }`}
          >
            N
          </div>
          {isConnected && (
            <div className="absolute w-7 h-7 rounded-full border border-stark-gold/70 animate-ping opacity-50" />
          )}
        </div>

        <div className="flex flex-col leading-tight">
          <div className="flex items-baseline space-x-1.5">
            <span className="font-black tracking-[0.18em] text-sm text-white stark-text-glow">
              NEW YORKER
            </span>
            <span className="text-[9px] uppercase font-bold px-1.5 rounded bg-stark-gold/20 text-stark-gold border border-stark-gold/40">
              MK-VII
            </span>
          </div>
          <span className="text-[9px] text-stark-cyan/70 tracking-widest font-mono">
            J.A.R.V.I.S. // NYC SPATIAL AI
          </span>
        </div>
      </div>

      {/* Center Target Status */}
      <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded bg-black/60 border border-stark-cyan/30 text-stark-cyan">
        <Cpu className="w-3.5 h-3.5 text-stark-cyan animate-pulse" />
        <span className="text-[10px] tracking-widest uppercase font-bold">
          {spatialState.replace(/_/g, " ")}
        </span>
      </div>

      {/* Right Controls & Telemetry */}
      <div className="flex items-center space-x-2">
        {/* Continuous Stream Pill */}
        {onToggleContinuous && (
          <button
            onClick={onToggleContinuous}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded text-[10px] font-bold tracking-wider border transition-all active:scale-95 ${
              isContinuousStreaming
                ? "bg-stark-red/20 text-stark-red border-stark-red/60 animate-pulse shadow-red-500/20 shadow-md"
                : "bg-white/5 text-stark-cyan border-stark-cyan/30 hover:bg-stark-cyan/10"
            }`}
            title="Toggle Continuous Stream (1.5 FPS)"
          >
            <Radio className="w-3 h-3" />
            <span className="hidden md:inline">
              {isContinuousStreaming ? "STREAM: ACTIVE" : "STREAM: SINGLE"}
            </span>
            {frameCount > 0 && <span className="font-mono text-stark-gold">#{frameCount}</span>}
          </button>
        )}

        {/* Camera Toggle Button */}
        {onToggleCamera && (
          <button
            onClick={onToggleCamera}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-black/60 border border-stark-cyan/30 text-[10px] text-stark-cyan hover:text-white transition-all active:scale-95 hover:border-stark-cyan"
            title={`Switch Optics (Currently ${facingMode === "user" ? "Front" : "Back"})`}
          >
            <Camera className="w-3 h-3 text-stark-cyan" />
            <span className="uppercase">{facingMode === "user" ? "FRONT" : "REAR"}</span>
          </button>
        )}

        {/* Latency Pill */}
        <div className="flex items-center space-x-1 px-2.5 py-1 rounded bg-black/60 border border-stark-cyan/30 text-[10px] text-stark-cyan">
          <Zap className="w-3 h-3 text-stark-gold animate-bounce" />
          <span className="font-mono text-white font-bold">{latencyMs}ms</span>
        </div>

        {/* Language Badge */}
        <div className="px-2 py-1 rounded bg-stark-cyan/10 border border-stark-cyan/40 text-[10px] font-black uppercase tracking-wider text-stark-cyan stark-text-glow">
          {currentLanguage}
        </div>
      </div>
    </header>
  );
};
