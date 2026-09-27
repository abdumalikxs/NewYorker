import React from "react";
import { Volume2 } from "lucide-react";

interface TranscriptProps {
  text: string;
  onSpeak?: (textToSpeak: string) => void;
}

export const Transcript: React.FC<TranscriptProps> = ({ text, onSpeak }) => {
  return (
    <div className="stark-panel stark-cut rounded p-4 shadow-2xl relative font-mono overflow-hidden">
      {/* Corner Brackets */}
      <div className="corner-bl" />
      <div className="corner-br" />

      {/* Top Header & Visualizer Equalizer */}
      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-stark-cyan/20">
        <div className="flex items-center space-x-2">
          <Volume2 className="w-4 h-4 text-stark-cyan animate-pulse" />
          <span className="text-[10px] uppercase font-bold tracking-widest text-stark-cyan stark-text-glow">
            J.A.R.V.I.S. // SPATIAL SYNTHESIS
          </span>
          {onSpeak && (
            <button
              onClick={() => onSpeak(text || "New Yorker voice online. ElevenLabs speech synthesizer is active.")}
              className="px-2 py-0.5 ml-2 text-[9px] font-black rounded stark-cut bg-stark-cyan/20 hover:bg-stark-cyan/40 border border-stark-cyan/60 text-stark-cyan flex items-center space-x-1 active:scale-95 transition-all"
              title="Click to hear ElevenLabs speak"
            >
              <span>🔊 TEST VOICE</span>
            </button>
          )}
        </div>

        {/* Animated Equalizer Waves */}
        <div className="flex items-center space-x-1 h-3">
          <span className="w-1 h-2 bg-stark-cyan animate-pulse" />
          <span className="w-1 h-3.5 bg-stark-gold animate-bounce" />
          <span className="w-1 h-1.5 bg-stark-cyan animate-pulse" />
          <span className="w-1 h-3 bg-stark-cyan animate-bounce" />
          <span className="w-1 h-2 bg-stark-gold animate-pulse" />
        </div>
      </div>


      {/* Main Spoken Text */}
      <p className="text-sm font-semibold text-white tracking-wide leading-relaxed stark-text-glow">
        {text ? (
          <span>{text}</span>
        ) : (
          <span className="text-stark-cyan/60 text-xs italic tracking-wider">
            [ SENSORS ARMED: POINT OPTICS AT SUBWAY SIGN OR EXECUTE VOICE ACT BELOW ]
          </span>
        )}
      </p>

      {/* Bottom Sub-label */}
      <div className="mt-2 flex items-center justify-between text-[9px] text-stark-cyan/60 pt-1 border-t border-white/5">
        <span>AUDIO PROTOCOL: ELEVENLABS STREAMING</span>
        <span className="text-stark-gold">SPECTRUM: 16.0 kHz PCM</span>
      </div>
    </div>
  );
};
