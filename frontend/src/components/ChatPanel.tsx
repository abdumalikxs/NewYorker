import React, { useEffect, useRef } from "react";
import { ChatMessage } from "../types/stream";
import { Volume2, User, Cpu, Trash2 } from "lucide-react";

interface ChatPanelProps {
  messages: ChatMessage[];
  onSpeak?: (text: string) => void;
  onClear?: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ messages, onSpeak, onClear }) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-black/85 backdrop-blur-xl border border-stark-cyan/30 rounded-lg stark-cut overflow-hidden shadow-2xl relative font-mono text-xs">
      {/* Corner Brackets */}
      <div className="corner-tl" />
      <div className="corner-tr" />
      <div className="corner-bl" />
      <div className="corner-br" />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-stark-cyan/20 bg-stark-cyan/5">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-stark-cyan animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-stark-cyan stark-text-glow">
            TELEMETRY // LOGS & CONVERSATION
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-stark-cyan/20 text-stark-cyan border border-stark-cyan/40">
            {messages.length}
          </span>
        </div>

        {onClear && (
          <button
            onClick={onClear}
            className="text-gray-400 hover:text-stark-red transition-colors p-1"
            title="Clear Chat Logs"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Scrollable Conversation Stream */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-stark-cyan/30 scrollbar-track-transparent"
      >
        {messages.map((msg) => {
          const isUser = msg.sender === "user";
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1`}
            >
              {/* Sender & Timestamp */}
              <div className="flex items-center space-x-1.5 text-[9px] text-gray-400 tracking-wider">
                {isUser ? (
                  <>
                    <span>{msg.timestamp}</span>
                    <span className="text-stark-gold font-bold flex items-center gap-0.5">
                      <User className="w-2.5 h-2.5" /> YOU
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-stark-cyan font-bold flex items-center gap-0.5">
                      <Cpu className="w-2.5 h-2.5" /> J.A.R.V.I.S.
                    </span>
                    <span>{msg.timestamp}</span>
                  </>
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[90%] px-3 py-2 rounded stark-cut transition-all ${
                  isUser
                    ? "bg-stark-gold/15 border border-stark-gold/40 text-gray-100"
                    : "bg-stark-cyan/15 border border-stark-cyan/40 text-white"
                }`}
              >
                <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                {/* Speaker playback button for assistant messages */}
                {!isUser && onSpeak && (
                  <div className="mt-1.5 pt-1 border-t border-stark-cyan/20 flex justify-end">
                    <button
                      onClick={() => onSpeak(msg.text)}
                      className="text-[9px] text-stark-cyan hover:text-white flex items-center space-x-1 hover:underline active:scale-95 transition-all"
                    >
                      <Volume2 className="w-2.5 h-2.5" />
                      <span>LISTEN</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
