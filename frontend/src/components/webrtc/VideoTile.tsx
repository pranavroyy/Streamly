import React, { useRef, useEffect } from "react";
import { MicOff, VideoOff, Loader2 } from "lucide-react";

interface VideoTileProps {
  stream: MediaStream | null;
  label: string;
  isLocal: boolean;
  isMuted: boolean;
  isCameraOff: boolean;
  connectionState?: RTCPeerConnectionState;
}

export const VideoTile: React.FC<VideoTileProps> = ({
  stream,
  label,
  isLocal,
  isMuted,
  isCameraOff,
  connectionState,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && stream && !isCameraOff) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, isCameraOff]);

  return (
    <div className="relative aspect-video w-full rounded-2xl bg-zinc-950 border border-zinc-800/80 overflow-hidden shadow-xl flex items-center justify-center group hover:border-zinc-700/80 transition-all">
      {/* Video Element */}
      {stream && !isCameraOff && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
        />
      )}

      {/* Avatar Placeholder for camera off / no stream */}
      {(!stream || isCameraOff) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/60 backdrop-blur-sm">
          <div className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl border bg-purple-600/10 text-purple-400 border-purple-500/20 shadow-md">
            {label ? label.charAt(0).toUpperCase() : "U"}
          </div>
          {isCameraOff && (
            <span className="text-zinc-500 text-xs mt-2 font-medium">Camera Off</span>
          )}
          {!isCameraOff && !stream && (
            <span className="text-zinc-500 text-xs mt-2 font-medium">Waiting for video...</span>
          )}
        </div>
      )}

      {/* Connection State Badge Overlay */}
      {!isLocal && connectionState && (
        <div className="absolute top-3 left-3 bg-zinc-950/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-zinc-800 flex items-center gap-1.5 text-[10px] font-mono shadow-sm">
          {connectionState === "connected" && (
            <>
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span className="text-emerald-400 font-semibold">Connected</span>
            </>
          )}
          {(connectionState === "connecting" || connectionState === "new") && (
            <>
              <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
              <span className="text-amber-400 font-medium">Connecting...</span>
            </>
          )}
          {(connectionState === "disconnected" || connectionState === "failed" || connectionState === "closed") && (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
              <span className="text-red-400 font-semibold">Failed</span>
            </>
          )}
        </div>
      )}

      {/* Label and Badge Overlay */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        <div className="bg-zinc-950/80 backdrop-blur-md px-3 py-1 rounded-xl border border-zinc-800 text-xs font-semibold text-white truncate max-w-[70%]">
          {label} {isLocal && <span className="text-[10px] text-purple-400 font-normal ml-1">(You)</span>}
        </div>
        
        <div className="flex gap-1.5">
          {isMuted && (
            <div className="p-1.5 bg-red-600/20 border border-red-500/30 text-red-400 rounded-lg backdrop-blur-md shadow-sm">
              <MicOff className="w-3.5 h-3.5" />
            </div>
          )}
          {isCameraOff && (
            <div className="p-1.5 bg-red-600/20 border border-red-500/30 text-red-400 rounded-lg backdrop-blur-md shadow-sm">
              <VideoOff className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
