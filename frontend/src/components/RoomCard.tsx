"use client";

import React, { useState, memo, useCallback } from "react";
import { RoomResponse, roomsApi } from "@/lib/roomsApi";
import { useAuth } from "@/context/AuthContext";
import { useCopyClipboard } from "@/hooks/useCopyClipboard";
import { isRoomOwner } from "@/lib/utils";
import DeleteRoomModal from "@/components/DeleteRoomModal";
import Link from "next/link";
import { 
  Video, 
  Users, 
  Trash2, 
  LogOut, 
  Crown, 
  ArrowRight, 
  Loader2,
  Copy,
  Check
} from "lucide-react";

interface RoomCardProps {
  room: RoomResponse;
  onRefresh: () => void;
}

const RoomCard: React.FC<RoomCardProps> = memo(({ room, onRefresh }) => {
  const { user } = useAuth();
  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { copied, copy } = useCopyClipboard();
  const isOwner = isRoomOwner(room, user);

  const handleCopyLink = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (typeof window !== "undefined") {
        copy(`${window.location.origin}/rooms/${room.id}`);
      }
    },
    [room.id, copy]
  );

  const handleLeave = useCallback(async () => {
    setLeaving(true);
    setError(null);
    try {
      await roomsApi.leaveRoom(room.id);
      onRefresh();
    } catch (err: any) {
      setError(err.message || "Failed to leave room");
    } finally {
      setLeaving(false);
    }
  }, [room.id, onRefresh]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    setError(null);
    try {
      await roomsApi.deleteRoom(room.id);
      setShowDeleteConfirm(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message || "Failed to delete room");
    } finally {
      setDeleting(false);
    }
  }, [room.id, onRefresh]);

  return (
    <div className="bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700/80 rounded-2xl p-5 flex flex-col justify-between gap-5 transition-all shadow-lg hover:shadow-purple-900/10 group">
      {/* Header Info */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-600/10 border border-purple-500/20 text-purple-400 rounded-xl">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base group-hover:text-purple-300 transition-colors line-clamp-1">
                {room.name}
              </h3>
              <p className="text-[11px] text-zinc-500 font-mono">ID: #{room.id}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {isOwner && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                <Crown className="w-3 h-3" />
                Owner
              </span>
            )}
            <span
              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                room.status === "ACTIVE"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-zinc-800 text-zinc-400 border-zinc-700"
              }`}
            >
              {room.status}
            </span>
          </div>
        </div>

        {/* Room metadata */}
        <div className="flex items-center justify-between text-xs text-zinc-400 pt-1 border-t border-zinc-800/60">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-zinc-500" />
            <span>{room.participants?.length || 0} Participant(s)</span>
          </div>

          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1 text-zinc-400 hover:text-purple-400 transition-colors text-[11px] bg-zinc-800/60 px-2 py-1 rounded-md"
            title="Copy Invite Link"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy Link</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="text-[11px] bg-red-500/10 text-red-400 border border-red-500/20 p-2 rounded-lg">
            {error}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between gap-2 pt-2">
        <Link
          href={`/rooms/${room.id}`}
          className="flex-1 inline-flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs py-2.5 px-4 rounded-xl shadow-md shadow-purple-600/20 transition-all"
        >
          <span>Enter Studio</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>

        {/* Leave button */}
        <button
          onClick={handleLeave}
          disabled={leaving}
          className="p-2.5 text-zinc-400 hover:text-amber-400 hover:bg-amber-400/10 border border-zinc-800 hover:border-amber-400/30 rounded-xl transition-all"
          title="Leave Room"
        >
          {leaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
        </button>

        {/* Delete button - Owner Only */}
        {isOwner && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleting}
            className="p-2.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 border border-zinc-800 hover:border-red-500/30 rounded-xl transition-all"
            title="Delete Room (Owner Only)"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Reusable Owner Confirmation Modal */}
      <DeleteRoomModal
        isOpen={showDeleteConfirm}
        roomName={room.name}
        isDeleting={deleting}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
});

RoomCard.displayName = "RoomCard";
export default RoomCard;
