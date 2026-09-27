import React from "react";
import { MessageSquare, CreditCard, AlertTriangle, Cpu, CloudSun, Clock } from "lucide-react";
import { ActionCardData } from "../types/stream";

interface ActionCardProps {
  card: ActionCardData;
}

export const ActionCard: React.FC<ActionCardProps> = ({ card }) => {
  const getIcon = () => {
    switch (card.type) {
      case "imessage":
        return <MessageSquare className="w-4 h-4 text-stark-cyan" />;
      case "nessie":
        return <CreditCard className="w-4 h-4 text-stark-gold" />;
      case "transit_alert":
        return <AlertTriangle className="w-4 h-4 text-stark-red" />;
      case "weather":
        return <CloudSun className="w-4 h-4 text-sky-300" />;
      case "clock":
        return <Clock className="w-4 h-4 text-stark-cyan" />;
      default:
        return <Cpu className="w-4 h-4 text-stark-cyan" />;
    }
  };

  const getTheme = () => {
    switch (card.type) {
      case "imessage":
        return {
          border: "border-stark-cyan/60",
          glow: "shadow-cyan-500/20 shadow-lg",
          tagBg: "bg-stark-cyan/20 text-stark-cyan",
          tag: "PHOTON // SPECTRUM",
        };
      case "nessie":
        return {
          border: "border-stark-gold/60",
          glow: "shadow-amber-500/20 shadow-lg",
          tagBg: "bg-stark-gold/20 text-stark-gold",
          tag: "CAPITAL ONE // NESSIE",
        };
      case "transit_alert":
        return {
          border: "border-stark-red/60",
          glow: "shadow-red-500/20 shadow-lg",
          tagBg: "bg-stark-red/20 text-stark-red",
          tag: "MTA // ATLAS RAG",
        };
      case "weather":
        return {
          border: "border-sky-400/60",
          glow: "shadow-sky-500/20 shadow-lg",
          tagBg: "bg-sky-400/20 text-sky-300",
          tag: "OPEN-METEO // HOURLY",
        };
      case "clock":
        return {
          border: "border-stark-cyan/70",
          glow: "shadow-cyan-500/30 shadow-lg",
          tagBg: "bg-stark-cyan/20 text-stark-cyan",
          tag: "NEW YORK // LOCAL",
        };
      default:
        return {
          border: "border-stark-cyan/40",
          glow: "shadow-cyan-500/10 shadow-md",
          tagBg: "bg-stark-cyan/10 text-stark-cyan",
          tag: "AGENTIC ACTION",
        };
    }
  };

  const theme = getTheme();

  if (card.type === "clock") {
    const [time, period = ""] = card.details.split(" ");
    return (
      <div
        className={`stark-panel stark-cut rounded px-5 py-4 border shadow-xl relative font-mono ${theme.border} ${theme.glow}`}
      >
        <div className="corner-tl" />
        <div className="corner-tr" />
        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-black uppercase tracking-[0.28em] px-2 py-0.5 rounded border border-white/10 ${theme.tagBg}`}>
            {theme.tag}
          </span>
          <span className="text-[11px] uppercase tracking-widest text-gray-400">{card.title}</span>
        </div>
        <div className="mt-2 flex items-end gap-3">
          <span className="text-6xl font-black leading-none tracking-tight text-white">{time}</span>
          <span className="mb-1 text-3xl font-bold leading-none text-stark-cyan">{period}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`stark-panel stark-cut rounded p-3 border shadow-xl relative font-mono transition-all duration-300 animate-in fade-in slide-in-from-top-3 ${theme.border} ${theme.glow}`}
    >
      <div className="corner-tl" />
      <div className="corner-tr" />

      <div className="flex items-start space-x-3">
        <div className="p-2 rounded bg-black/60 border border-white/10 flex-shrink-0">
          {getIcon()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white tracking-wider truncate uppercase">
              {card.title}
            </h4>
            <span
              className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border border-white/10 ${theme.tagBg}`}
            >
              {theme.tag}
            </span>
          </div>

          <p className="text-xs text-gray-200 mt-1 leading-snug line-clamp-2">
            {card.details}
          </p>

          <div className="mt-1.5 flex items-center justify-between text-[8px] text-gray-400 font-mono tracking-widest uppercase">
            <span>STATUS: VERIFIED & EXECUTED</span>
            <span className="text-stark-cyan">NODE: DIGITALOCEAN NYC3</span>
          </div>
        </div>
      </div>
    </div>
  );
};
