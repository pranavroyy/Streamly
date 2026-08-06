import React from "react";
import { Video, Mic, AlertCircle, RefreshCw, KeyRound } from "lucide-react";

interface PermissionGateProps {
  mediaError: string | null;
  isRequesting: boolean;
  onRequestMedia: () => void;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  mediaError,
  isRequesting,
  onRequestMedia,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto bg-zinc-900/80 border border-zinc-800/90 rounded-2xl shadow-2xl backdrop-blur-md">
      <div className="p-4 bg-purple-600/10 border border-purple-500/20 text-purple-400 rounded-full mb-6 animate-pulse">
        <Video className="w-8 h-8" />
      </div>

      <h3 className="text-xl font-bold text-white mb-2">Media Devices Required</h3>
      <p className="text-sm text-zinc-400 mb-6">
        Streamly needs access to your camera and microphone to connect you to this studio session.
      </p>

      {mediaError ? (
        <div className="w-full text-left space-y-3 mb-6 bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-xs text-red-400">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-white">Access Error</p>
              <p className="mt-0.5 leading-relaxed">{mediaError}</p>
            </div>
          </div>
          <div className="border-t border-red-500/10 pt-2 flex items-center gap-1.5 text-zinc-500">
            <KeyRound className="w-3.5 h-3.5" />
            <span>Check your browser's address bar block icons.</span>
          </div>
        </div>
      ) : (
        <div className="flex justify-center gap-4 text-xs font-mono text-zinc-500 mb-6 bg-black/30 py-2.5 px-4 rounded-xl border border-zinc-800/60 w-full">
          <div className="flex items-center gap-1">
            <Video className="w-3.5 h-3.5 text-purple-400" />
            <span>Camera input</span>
          </div>
          <div className="w-px h-3.5 bg-zinc-800" />
          <div className="flex items-center gap-1">
            <Mic className="w-3.5 h-3.5 text-purple-400" />
            <span>Microphone input</span>
          </div>
        </div>
      )}

      <button
        onClick={onRequestMedia}
        disabled={isRequesting}
        className="w-full py-3 px-5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isRequesting ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Allowing permissions...</span>
          </>
        ) : (
          <>
            <span>{mediaError ? "Try Again" : "Join with Camera & Mic"}</span>
          </>
        )}
      </button>
    </div>
  );
};
