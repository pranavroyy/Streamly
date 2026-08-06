"use client";

import React, { useState, memo } from "react";
import { roomsApi, RoomResponse } from "@/lib/roomsApi";
import { X, Video, Link2, Loader2, PlusCircle, LogIn } from "lucide-react";

interface RoomActionModalProps {
  isOpen: boolean;
  mode: "create" | "join";
  onClose: () => void;
  onSuccess: (result: RoomResponse | number | string) => void;
}

const RoomActionModal: React.FC<RoomActionModalProps> = memo(({ isOpen, mode, onClose, onSuccess }) => {
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();

    if (!trimmed) {
      setError(mode === "create" ? "Please enter a room name" : "Please enter a valid Room ID or link");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (mode === "create") {
        const room = await roomsApi.createRoom({ name: trimmed });
        setInputValue("");
        onSuccess(room);
        onClose();
      } else {
        const match = trimmed.match(/\/rooms\/([^\/?#]+)/);
        const identifier = match ? match[1].trim() : trimmed;

        if (!identifier) {
          throw new Error("Please enter a valid Room Code, ID or invite link");
        }

        await roomsApi.joinRoom(identifier);
        setInputValue("");
        onSuccess(identifier);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || `Failed to ${mode} room. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-6 text-zinc-900 dark:text-zinc-100 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5 font-semibold text-base">
            {mode === "create" ? (
              <>
                <Video className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h2 className="text-zinc-900 dark:text-white">Create New Studio Room</h2>
              </>
            ) : (
              <>
                <Link2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-zinc-900 dark:text-white">Join Room by Code or Link</h2>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error alert */}
        {error && (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-xs px-4 py-3 rounded-xl font-medium">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="modal-input" className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              {mode === "create" ? "Room Name" : "Room Code or Invite Link"}
            </label>
            <input
              id="modal-input"
              type="text"
              placeholder={mode === "create" ? "e.g. Episode #42: Tech Discussion" : "e.g. rm-b75epa or http://localhost:3000/rooms/rm-b75epa"}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className={`w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:ring-1 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 rounded-xl px-4 py-3 outline-none transition-all ${
                mode === "create" ? "focus:border-purple-500" : "focus:border-indigo-500 font-mono"
              }`}
              autoFocus
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl disabled:opacity-50 text-white text-xs font-semibold shadow-md transition-all ${
                mode === "create"
                  ? "bg-purple-600 hover:bg-purple-500"
                  : "bg-indigo-600 hover:bg-indigo-500"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : mode === "create" ? (
                <>
                  <PlusCircle className="w-4 h-4" />
                  <span>Create Room</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Join Room</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

RoomActionModal.displayName = "RoomActionModal";
export default RoomActionModal;
