import React, { useEffect, useState } from "react";
import { CheckCircle2, XCircle, ArrowLeft, RefreshCw, Cpu, Zap, ShieldCheck } from "lucide-react";
import { env } from "../config/env";

interface HealthData {
  message?: string;
  status?: string;
  service?: string;
  environment?: string;
}

interface HealthPageProps {
  onBack?: () => void;
}

export const HealthPage: React.FC<HealthPageProps> = ({ onBack }) => {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pingMs, setPingMs] = useState<number | null>(null);

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    const start = performance.now();
    try {
      const res = await fetch(`${env.API_URL}/api/hello`);
      const elapsed = Math.round(performance.now() - start);
      setPingMs(elapsed);

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || "Failed to reach backend");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="min-h-screen bg-stark-dark text-white flex flex-col items-center justify-center p-4 font-mono select-none stark-scanlines">
      <div className="stark-panel stark-cut rounded w-full max-w-md p-6 shadow-2xl relative space-y-6">
        {/* Corner Brackets */}
        <div className="corner-tl" />
        <div className="corner-tr" />
        <div className="corner-bl" />
        <div className="corner-br" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-stark-cyan/30 pb-3">
          <div className="flex items-center space-x-2.5">
            <Cpu className="w-5 h-5 text-stark-cyan animate-pulse" />
            <div>
              <h1 className="text-sm font-black tracking-widest uppercase stark-text-glow">
                DIAGNOSTICS // PROTOCOL
              </h1>
              <span className="text-[9px] text-gray-400">STARK MARK-VII SYSTEM BUS</span>
            </div>
          </div>
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center space-x-1 text-[10px] text-stark-cyan hover:text-white px-3 py-1.5 rounded stark-cut bg-stark-cyan/10 border border-stark-cyan/30 transition-all uppercase tracking-wider"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>RETURN TO HUD</span>
            </button>
          )}
        </div>

        {/* Status Reactor Core Display */}
        <div className="flex flex-col items-center justify-center py-2 space-y-3">
          <div className="relative flex items-center justify-center">
            <div className="w-24 h-24 rounded-full arc-ring-inner flex items-center justify-center">
              {loading ? (
                <RefreshCw className="w-10 h-10 text-stark-cyan animate-spin" />
              ) : error ? (
                <XCircle className="w-12 h-12 text-stark-red" />
              ) : (
                <CheckCircle2 className="w-12 h-12 text-stark-cyan stark-text-glow" />
              )}
            </div>
            {!loading && !error && (
              <div className="absolute w-28 h-28 rounded-full border border-dashed border-stark-cyan/40 animate-spin-slow" />
            )}
          </div>

          <div className="text-center">
            <h2 className="text-xl font-black tracking-widest uppercase text-white stark-text-glow">
              {loading ? "SCANNING CORE BUS..." : data?.message || (error ? "LINK SEVERED" : "NOMINAL")}
            </h2>
            <p className="text-[10px] text-gray-400 mt-1 font-mono tracking-wider">
              ENDPOINT: <span className="text-stark-cyan">{env.API_URL}/api/hello</span>
            </p>
          </div>
        </div>

        {/* Telemetry Matrix Grid */}
        <div className="rounded bg-black/60 p-4 border border-stark-cyan/20 space-y-2.5 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 tracking-wider">PAYLOAD MESSAGE</span>
            <span className="font-bold text-stark-cyan text-sm stark-text-glow">
              {data?.message || "—"}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-400 tracking-wider">BUS STATUS</span>
            <span className={`font-black uppercase tracking-widest ${data?.status === "healthy" ? "text-lens-success" : "text-stark-red"}`}>
              {data?.status || (error ? "OFFLINE" : "PROBING")}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-400 tracking-wider">NETWORK PING</span>
            <span className="font-mono text-white flex items-center space-x-1">
              <Zap className="w-3 h-3 text-stark-gold" />
              <span className="font-bold">{pingMs !== null ? `${pingMs}ms` : "—"}</span>
            </span>
          </div>

          <div className="flex justify-between items-center pt-1 border-t border-white/5 text-[10px]">
            <span className="text-gray-400">SECURITY / CIPHER</span>
            <span className="text-stark-cyan flex items-center space-x-1">
              <ShieldCheck className="w-3 h-3" />
              <span>AES-256 GCM</span>
            </span>
          </div>

          {error && (
            <div className="pt-2 border-t border-stark-red/30 text-stark-red text-[11px] font-mono">
              FAULT: {error}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex space-x-3 pt-2">
          <button
            onClick={checkHealth}
            disabled={loading}
            className="flex-1 flex items-center justify-center space-x-2 py-3 rounded stark-cut bg-white/5 hover:bg-white/10 active:scale-98 transition-all font-mono font-bold text-xs border border-stark-cyan/30 text-stark-cyan"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>RE-PING BUS</span>
          </button>

          {onBack && (
            <button
              onClick={onBack}
              className="flex-1 flex items-center justify-center space-x-2 py-3 rounded stark-cut bg-stark-cyan hover:bg-stark-cyan/90 text-black font-mono font-black text-xs shadow-lg transition-all"
            >
              <span>ENGAGE HUD</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
