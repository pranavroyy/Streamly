"use client";

import React, { useState, useEffect } from "react";
import { Activity, Captions, MessageSquareText } from "lucide-react";

const PRESET_HEIGHTS = [35, 65, 30, 85, 55, 25, 75, 95, 45, 70, 30, 80, 50, 90, 60, 35, 75, 45, 90, 65, 30, 80, 55, 40];

const SAMPLE_CAPTIONS = [
  "Hello! What's up?",
  "Bonjour! Ça va?",
  "नमस्ते! क्या हाल है?",
];

export default function AnimatedAudioWaveform({
  barCount = 24,
  heightClass = "h-10",
  showDetails = true,
  showCaptions = true,
  captions = SAMPLE_CAPTIONS,
}: {
  barCount?: number;
  heightClass?: string;
  showDetails?: boolean;
  showCaptions?: boolean;
  captions?: string[];
}) {
  const bars = PRESET_HEIGHTS.slice(0, barCount);
  const [captionIndex, setCaptionIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!showCaptions || captions.length <= 1) return;

    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCaptionIndex((prev) => (prev + 1) % captions.length);
        setIsVisible(true);
      }, 300);
    }, 3800);

    return () => clearInterval(interval);
  }, [showCaptions, captions]);

  return (
    <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 space-y-2.5 transition-colors">
      {showDetails && (
        <div className="flex items-center justify-between text-[10px] font-mono">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-zinc-700 dark:text-zinc-300 font-semibold flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-purple-500" /> Audio Input Stream
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold mr-1">-14 dBFS</span>
            <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80 px-1.5 py-0.5 rounded font-semibold text-[9px] flex items-center gap-1">
              <Captions className="w-3 h-3" /> CC LIVE
            </span>
            <span className="bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded font-semibold text-[9px] tracking-wide uppercase">
              48kHz PCM
            </span>
          </div>
        </div>
      )}

      {/* Waveform Bar Container */}
      <div className={`${heightClass} flex items-center justify-between gap-1 px-2.5 bg-zinc-200/70 dark:bg-black/70 rounded-lg overflow-hidden`}>
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-full bg-gradient-to-t from-purple-500 via-indigo-400 to-emerald-400 animate-soundwave"
            style={{
              height: `${h}%`,
              animationDelay: `${(i % 5) * 0.18}s`,
              animationDuration: `${0.75 + (i % 3) * 0.25}s`,
            }}
          />
        ))}
      </div>

      {/* Live Captioning Track Subtitle */}
      {showCaptions && (
        <div className="flex items-center gap-2 bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/90 dark:border-zinc-800/90 px-2.5 py-1.5 rounded-lg text-[11px] shadow-sm overflow-hidden">
          <div className="flex items-center gap-1 shrink-0 text-purple-600 dark:text-purple-400 font-mono text-[10px] font-semibold">
            <MessageSquareText className="w-3 h-3 text-indigo-500" />
            <span>[Transcribing]:</span>
          </div>
          <p
            className={`truncate italic text-zinc-700 dark:text-zinc-300 font-normal leading-tight transition-opacity duration-300 ${isVisible ? "opacity-100" : "opacity-0"
              }`}
          >
            "{captions[captionIndex]}"
          </p>
          <span className="ml-auto shrink-0 flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </div>
      )}
    </div>
  );
}

export function MiniSoundwaveBars({ count = 4 }: { count?: number }) {
  return (
    <div className="flex items-center gap-0.5 h-3">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="w-0.5 h-full bg-emerald-500 rounded-full animate-soundwave"
          style={{
            animationDelay: `${i * 0.18}s`,
            animationDuration: "0.7s",
          }}
        />
      ))}
    </div>
  );
}
