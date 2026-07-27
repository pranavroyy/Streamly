"use client";

import React, { useState, memo, useCallback } from "react";
import { RoomResponse, roomsApi } from "@/lib/roomsApi";
import { useAuth } from "@/context/AuthContext";
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
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwner = user?.id ? room.ownerId === user.id : user?.fullName === room.ownerName;

  const handleCopyLink = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const link = `${window.location.origin}/rooms/${room.id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [room.id]);

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
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
              room.status === "ACTIVE" 
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                : "bg-zinc-800 text-zinc-400 border-zinc-700"
            }`}>
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

      {/* Owner Confirmation Modal for Deletion */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h4 className="font-bold text-white text-base">Delete Studio Room?</h4>
            <p className="text-xs text-zinc-400">
              Are you sure you want to delete <span className="text-white font-semibold">{room.name}</span>? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white rounded-lg border border-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg shadow-md shadow-red-600/30 transition-all flex items-center gap-1.5"
              >
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

RoomCard.displayName = "RoomCard";
export default RoomCard;
