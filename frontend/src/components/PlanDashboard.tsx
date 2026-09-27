import React from "react";
import { ListOrdered, Sparkles, EyeOff, Eye, Trash2 } from "lucide-react";

import { MissionPlan } from "../types/stream";

interface PlanDashboardProps {
  plan: MissionPlan;
  isVisible: boolean;
  onHide: () => void;    // Collapse – keeps plan data
  onShow: () => void;    // Re-open collapsed panel
  onDestroy: () => void; // Permanently wipe
}

export const PlanDashboard: React.FC<PlanDashboardProps> = ({
  plan,
  isVisible,
  onHide,
  onShow,
  onDestroy,
}) => {
  if (!plan || !plan.steps || plan.steps.length === 0) return null;

  // ── COLLAPSED PILL ──────────────────────────────────────────────────────────
  if (!isVisible) {
    return (
      <div
        className="absolute top-16 right-3 flex items-center gap-2 px-3 py-1.5
                   border border-stark-cyan/60 bg-black/90 backdrop-blur-xl
                   rounded-full shadow-[0_0_14px_rgba(0,240,255,0.25)] z-30
                   animate-in fade-in slide-in-from-right-2 duration-200 cursor-pointer
                   hover:border-stark-cyan hover:shadow-[0_0_22px_rgba(0,240,255,0.4)]
                   transition-all group"
        onClick={onShow}
        title="Open mission plan"
      >
        <Eye className="w-3.5 h-3.5 text-stark-cyan group-hover:scale-110 transition-transform" />
        <span className="text-[10px] font-black uppercase tracking-widest text-stark-cyan stark-text-glow">
          {plan.title || "MISSION PLAN"}
        </span>
        <span className="text-[9px] px-1 py-0.5 rounded bg-stark-cyan/20 text-stark-cyan border border-stark-cyan/40">
          {plan.steps.length}/6
        </span>
      </div>
    );
  }

  // ── EXPANDED PANEL ──────────────────────────────────────────────────────────
  return (
    <div className="absolute top-16 right-3 w-72 md:w-80 border-2 border-stark-cyan bg-black/95 backdrop-blur-xl rounded-lg shadow-[0_0_25px_rgba(0,240,255,0.35)] z-30 font-mono animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Corner cut accents */}
      <div className="corner-tl" />
      <div className="corner-tr" />
      <div className="corner-bl" />
      <div className="corner-br" />

      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-stark-cyan/30 bg-stark-cyan/10">
        <div className="flex items-center space-x-2">
          <ListOrdered className="w-4 h-4 text-stark-cyan animate-pulse" />
          <span className="text-[11px] font-black uppercase tracking-wider text-stark-cyan stark-text-glow truncate max-w-[160px]">
            {plan.title || "MISSION PLAN"}
          </span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-stark-cyan/20 text-stark-cyan border border-stark-cyan/40">
            {plan.steps.length}/6 STEPS
          </span>

          {/* Collapse / Hide button */}
          <button
            onClick={onHide}
            title="Collapse dashboard (keeps plan)"
            className="p-1 rounded hover:bg-stark-cyan/20 text-gray-400 hover:text-stark-cyan transition-colors"
          >
            <EyeOff className="w-3.5 h-3.5" />
          </button>

          {/* Destroy / permanently remove */}
          <button
            onClick={onDestroy}
            title="Destroy plan permanently"
            className="p-1 rounded hover:bg-stark-red/20 text-gray-400 hover:text-stark-red transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Steps List (Max 6 steps) */}
      <div className="p-3 space-y-2">
        {plan.steps.slice(0, 6).map((step, idx) => (
          <div
            key={idx}
            className="flex items-start space-x-2.5 p-2 rounded bg-white/[0.03] border border-stark-cyan/20 hover:border-stark-cyan/50 hover:bg-stark-cyan/[0.05] transition-all group"
          >
            <div className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center bg-stark-cyan/20 text-stark-cyan border border-stark-cyan/40 text-[10px] font-black group-hover:scale-105 transition-transform">
              {idx + 1}
            </div>
            <p className="text-xs text-gray-200 leading-snug group-hover:text-white transition-colors">
              {step}
            </p>
          </div>
        ))}
      </div>

      {/* Footer bar */}
      <div className="px-3 py-1.5 bg-black/60 border-t border-stark-cyan/20 flex items-center justify-between text-[9px] text-gray-400">
        <div className="flex items-center space-x-1">
          <Sparkles className="w-3 h-3 text-stark-gold" />
          <span>J.A.R.V.I.S. ACTIVE PROTOCOL</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onHide}
            className="text-stark-cyan/70 hover:text-stark-cyan uppercase tracking-wider font-semibold transition-colors"
          >
            COLLAPSE
          </button>
          <span className="text-gray-600">|</span>
          <button
            onClick={onDestroy}
            className="text-stark-red/80 hover:text-stark-red uppercase tracking-wider font-semibold transition-colors"
          >
            DESTROY
          </button>
        </div>
      </div>
    </div>
  );
};
