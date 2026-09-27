import React from "react";
import { Camera, RefreshCw } from "lucide-react";

// MTA bullets, in official line colors — the New Yorker signature on the HUD.
const SUBWAY_LINES = [
  { line: "1", className: "mta-red" },
  { line: "A", className: "mta-blue" },
  { line: "N", className: "mta-yellow" },
  { line: "7", className: "mta-orange" },
  { line: "4", className: "mta-green" },
];

interface CameraViewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  hasPermission: boolean | null;
  error: string | null;
  onRetry?: () => void;
  spatialState?: string;
  hasActivePlan?: boolean;
  children?: React.ReactNode;
}

export const CameraView: React.FC<CameraViewProps> = ({
  videoRef,
  hasPermission,
  error,
  onRetry,
  spatialState = "STREET_ENTRANCE",
  hasActivePlan = false,
  children,
}) => {
  if (hasPermission === false) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-stark-dark z-10">
        <div className="w-16 h-16 rounded-full bg-stark-red/20 text-stark-red flex items-center justify-center mb-4 border border-stark-red/40 animate-pulse">
          <Camera className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-mono font-bold mb-2 text-white stark-text-glow tracking-widest uppercase">
          Optical Sensor Offline
        </h2>
        <p className="text-gray-400 text-xs font-mono max-w-xs mb-4">
          NEW YORKER NEEDS CAMERA ACCESS TO READ THE CITY AROUND YOU.
        </p>
        {error && (
          <span className="text-xs text-stark-red font-mono max-w-sm mb-4 px-3 py-1.5 rounded bg-stark-red/10 border border-stark-red/30">
            {error}
          </span>
        )}
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center space-x-2 px-5 py-2.5 rounded stark-cut bg-stark-cyan text-black font-mono font-black text-xs shadow-lg active:scale-95 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>RE-ENGAGE SENSORS</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-black select-none">
      {/* 1. Underlying Live Camera Video */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        onLoadedMetadata={() => {
          videoRef.current?.play().catch(() => {});
        }}
        className="absolute inset-0 w-full h-full object-cover filter contrast-[1.08] brightness-[0.95]"
      />

      {/* 2. Holographic Scanlines & CRT vignette */}
      <div className="pointer-events-none absolute inset-0 stark-scanlines opacity-75" />
      <div className="pointer-events-none absolute inset-0 bg-radial-vignette opacity-50" />

      {/* 3. Central Iron Man / Arc Reactor Target Reticle */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {/* Outer Rotating Gear Ring */}
        <div className="w-72 h-72 rounded-full arc-ring-outer animate-spin-slow flex items-center justify-center relative">
          <div className="absolute top-0 w-2 h-2 bg-stark-cyan shadow-cyan-500 shadow-md" />
          <div className="absolute bottom-0 w-2 h-2 bg-stark-cyan shadow-cyan-500 shadow-md" />
          <div className="absolute left-0 w-2 h-2 bg-stark-cyan shadow-cyan-500 shadow-md" />
          <div className="absolute right-0 w-2 h-2 bg-stark-cyan shadow-cyan-500 shadow-md" />
        </div>

        {/* Counter-Rotating Segmented Ring */}
        <div className="absolute w-56 h-56 rounded-full border border-dashed border-stark-cyan/60 animate-spin-reverse flex items-center justify-center" />

        {/* Center Reactor Core */}
        <div className="absolute w-44 h-44 rounded-full arc-ring-inner flex items-center justify-center">
          {/* Horizon Line / Pitch Indicator */}
          <div className="absolute w-64 h-[1px] bg-gradient-to-r from-transparent via-stark-cyan/60 to-transparent" />
          <div className="absolute h-40 w-[1px] bg-gradient-to-b from-transparent via-stark-cyan/40 to-transparent" />

          {/* Central Target Dot */}
          <div className="w-3 h-3 rounded-full bg-stark-cyan animate-pulse shadow-lg shadow-stark-cyan" />
        </div>

        {/* Targeting HUD Brackets */}
        <div className="absolute w-80 h-80 pointer-events-none">
          <div className="corner-tl w-5 h-5 border-t-2 border-l-2 border-stark-cyan" />
          <div className="corner-tr w-5 h-5 border-t-2 border-r-2 border-stark-cyan" />
          <div className="corner-bl w-5 h-5 border-b-2 border-l-2 border-stark-cyan" />
          <div className="corner-br w-5 h-5 border-b-2 border-r-2 border-stark-cyan" />
        </div>

        {/* Live Spatial Target Tag */}
        <div className="absolute translate-y-24 flex items-center space-x-2 font-mono text-[10px] tracking-widest text-stark-cyan bg-black/60 px-3 py-1 rounded border border-stark-cyan/40 stark-text-glow backdrop-blur-md">
          <span className="w-1.5 h-1.5 rounded-full bg-stark-cyan animate-ping" />
          <span>TARGET: {spatialState.replace(/_/g, " ")}</span>
          <span className="text-stark-gold font-bold">|| LOCKED</span>
        </div>
      </div>

      {/* 4. Left Flank HUD Telemetry (Pitch, Coordinates, Energy) */}
      <div className="pointer-events-none absolute left-4 top-24 bottom-32 hidden md:flex flex-col justify-between font-mono text-[10px] text-stark-cyan/80 z-10">
        <div className="space-y-1 bg-black/40 p-2.5 rounded border-l-2 border-stark-gold backdrop-blur-sm">
          <div className="text-stark-gold font-bold tracking-wider">NEW YORKER // GRID</div>
          <div>LAT: 40.7128° N</div>
          <div>LON: 74.0060° W</div>
          <div>BOROUGH: MANHATTAN</div>
          <div className="flex space-x-1 pt-1">
            {SUBWAY_LINES.map(({ line, className }) => (
              <span key={line} className={`mta-bullet w-4 h-4 text-[8px] ${className}`}>
                {line}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-1 bg-black/40 p-2.5 rounded border-l-2 border-stark-gold backdrop-blur-sm">
          <div className="text-stark-gold font-bold tracking-wider">ARC POWER // 98%</div>
          <div className="w-24 h-1.5 bg-black/60 rounded-full overflow-hidden border border-stark-gold/40">
            <div className="w-[98%] h-full bg-stark-gold animate-pulse" />
          </div>
          <div className="text-[9px] text-gray-400">OUTPUT: 3.2 GJ/S</div>
        </div>
      </div>

      {/* 5. Right Flank HUD Telemetry (AI Pipeline, Quantum Buffer) */}
      {!hasActivePlan && (
        <div className="pointer-events-none absolute right-4 top-24 bottom-32 hidden md:flex flex-col justify-between items-end font-mono text-[10px] text-stark-cyan/80 z-10 text-right">
          <div className="space-y-1 bg-black/40 p-2.5 rounded border-r-2 border-stark-cyan backdrop-blur-sm">
            <div className="text-stark-cyan font-bold tracking-wider">J.A.R.V.I.S. // CORE</div>
            <div>VISION: GEMINI 3.5 FL</div>
            <div>VOICE: ELEVENLABS</div>
            <div>FARES: CAPITAL ONE</div>
            <div>SKY: OPEN-METEO</div>
          </div>

          <div className="space-y-1 bg-black/40 p-2.5 rounded border-r-2 border-stark-cyan backdrop-blur-sm">
            <div className="text-stark-cyan font-bold tracking-wider">SPATIAL BUFFER</div>
            <div className="flex space-x-1 justify-end">
              <span className="w-1.5 h-3 bg-stark-cyan" />
              <span className="w-1.5 h-3 bg-stark-cyan" />
              <span className="w-1.5 h-3 bg-stark-cyan" />
              <span className="w-1.5 h-3 bg-stark-cyan" />
              <span className="w-1.5 h-3 bg-stark-cyan/40" />
            </div>
            <div className="text-[9px] text-gray-400">FIFO QUEUE: ACTIVE</div>
          </div>
        </div>
      )}

      {/* Embedded HUD Overlays (Over video and reticle) */}
      {children}
    </div>
  );
};
