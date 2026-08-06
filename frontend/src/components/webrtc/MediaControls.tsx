import React from "react";
import { Mic, MicOff, Video, VideoOff, LogOut } from "lucide-react";

interface MediaControlsProps {
  isMuted: boolean;
  isCameraOff: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onLeave: () => void;
  disabled?: boolean;
}

export const MediaControls: React.FC<MediaControlsProps> = ({
  isMuted,
  isCameraOff,
  onToggleMute,
  onToggleCamera,
  onLeave,
  disabled = false,
}) => {
  return (
    <div className="flex items-center justify-center gap-4 bg-zinc-950/90 backdrop-blur-md px-6 py-4.5 rounded-2xl border border-zinc-850 shadow-2xl z-40">
      {/* Mute Mic Button */}
      <button
        onClick={onToggleMute}
        disabled={disabled}
        className={`p-3.5 rounded-xl border transition-all ${
          isMuted
            ? "bg-red-600/10 border-red-500/30 text-red-400 hover:bg-red-600/20"
            : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-850 hover:text-white"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
      >
        {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
      </button>

      {/* Toggle Camera Button */}
      <button
        onClick={onToggleCamera}
        disabled={disabled}
        className={`p-3.5 rounded-xl border transition-all ${
          isCameraOff
            ? "bg-red-600/10 border-red-500/30 text-red-400 hover:bg-red-600/20"
            : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-850 hover:text-white"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
      >
        {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
      </button>

      {/* Visual Divider */}
      <div className="h-6 w-px bg-zinc-800" />

      {/* Disconnect/Leave Button */}
      <button
        onClick={onLeave}
        className="p-3.5 bg-red-600 hover:bg-red-500 text-white rounded-xl shadow-lg shadow-red-600/15 flex items-center justify-center transition-all hover:scale-105"
        title="Leave Studio Session"
      >
        <LogOut className="w-5 h-5" />
      </button>
    </div>
  );
};
